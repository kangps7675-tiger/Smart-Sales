import { NextRequest, NextResponse } from "next/server";
import {
  parseTabularRowsToReportEntries,
  type ParseReportOptions,
  type ReportImportConfig,
} from "@/lib/report-entry-map";
import { fetchSheetRows } from "@/lib/google-sheets";
import { getAuthContext } from "@/server/auth";
import { supabaseAdmin } from "@/server/supabase";

export const dynamic = "force-dynamic";

const INFLOW_OPTIONS = ["로드", "컨택", "전화", "온라인", "지인"] as const;

async function getReportImportConfig(shopId: string): Promise<ReportImportConfig | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("shop_settings")
      .select("report_import_config")
      .eq("shop_id", shopId)
      .maybeSingle();
    if (error) return null;
    const cfg = (data as { report_import_config?: unknown } | null)?.report_import_config;
    if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) return null;
    return cfg as ReportImportConfig;
  } catch {
    return null;
  }
}

function entryToConsultationRow(
  entry: Record<string, unknown> & { shop_id?: string; shopId?: string },
  shopId: string
) {
  const name = String(entry.name ?? "").trim() || "—";
  const phone = entry.phone != null ? String(entry.phone).trim() : null;
  const productName = entry.productName != null ? String(entry.productName).trim() : null;
  const salesPerson = entry.salesPerson != null ? String(entry.salesPerson).trim() : null;
  let consultationDate = entry.saleDate != null ? String(entry.saleDate).trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}/.test(consultationDate)) {
    consultationDate = new Date().toISOString().slice(0, 10);
  } else {
    consultationDate = consultationDate.slice(0, 10);
  }
  const path = entry.path != null ? String(entry.path).trim() : "";
  const inflow_type =
    path && INFLOW_OPTIONS.includes(path as (typeof INFLOW_OPTIONS)[number])
      ? (path as (typeof INFLOW_OPTIONS)[number])
      : null;
  return {
    shop_id: shopId,
    name,
    phone: phone || null,
    product_name: productName,
    consultation_date: consultationDate,
    sales_person: salesPerson,
    activation_status: "X" as const,
    inflow_type,
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const shopId = String(body?.shop_id ?? "").trim();
    const url = String(body?.url ?? "").trim();

    if (!shopId || !url) {
      return NextResponse.json({ error: "shop_id and url are required" }, { status: 400 });
    }

    if (auth.role === "tenant_admin" || auth.role === "staff") {
      if (auth.shopId !== shopId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      auth.role !== "super_admin" &&
      auth.role !== "tenant_admin" &&
      auth.role !== "staff"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let sheetResult;
    try {
      sheetResult = await fetchSheetRows(url);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Google Sheets 조회에 실패했습니다." },
        { status: 400 },
      );
    }

    const { rows } = sheetResult;
    const importConfig = await getReportImportConfig(shopId);
    const options: ParseReportOptions = { config: importConfig ?? undefined };

    const maxHeaderRow = Math.min(30, Math.max(0, rows.length - 2));
    let bestResult = parseTabularRowsToReportEntries(rows, shopId, options);
    if (bestResult.entries.length === 0 && maxHeaderRow >= 1) {
      for (let startRow = 1; startRow <= maxHeaderRow; startRow++) {
        const candidateRows = [rows[startRow], ...rows.slice(startRow + 1)] as unknown[][];
        if (candidateRows.length < 2) break;
        const parsedResult = parseTabularRowsToReportEntries(candidateRows, shopId, options);
        if (parsedResult.entries.length > 0) {
          bestResult = parsedResult;
          break;
        }
      }
    }
    if (bestResult.entries.length === 0 && rows.length >= 3) {
      const maxTwoRowStart = Math.min(15, rows.length - 3);
      for (let start = 0; start <= maxTwoRowStart; start++) {
        const r0 = (rows[start] as unknown[]) ?? [];
        const r1 = (rows[start + 1] as unknown[]) ?? [];
        const len = Math.max(r0.length, r1.length);
        const combinedHeader = Array.from({ length: len }, (_, i) =>
          String((r1[i] ?? "") || (r0[i] ?? "")).trim()
        );
        const candidateRows = [combinedHeader, ...rows.slice(start + 2)] as unknown[][];
        const parsedResult = parseTabularRowsToReportEntries(candidateRows, shopId, options);
        if (parsedResult.entries.length > 0) {
          bestResult = parsedResult;
          break;
        }
      }
    }

    const { entries, errors } = bestResult;
    const consultationRows = entries.map((e) =>
      entryToConsultationRow(
        { ...e, shop_id: shopId, shopId } as Record<string, unknown> & { shop_id: string; shopId: string },
        shopId
      )
    );

    // 기존 CRM 데이터(예정건 포함) 전부 삭제 후 새 데이터로 교체
    const { error: deleteError } = await supabaseAdmin
      .from("crm_consultations")
      .delete()
      .eq("shop_id", shopId);

    if (deleteError) {
      console.error("[crm/import-google-sheets] delete existing consultations", deleteError);
      return NextResponse.json(
        { error: "기존 상담 데이터 삭제에 실패했습니다.", detail: deleteError.message },
        { status: 500 }
      );
    }

    const BATCH_SIZE = 80;
    let insertedCount = 0;
    for (let i = 0; i < consultationRows.length; i += BATCH_SIZE) {
      const batch = consultationRows.slice(i, i + BATCH_SIZE);
      const { data: batchData, error: insertError } = await supabaseAdmin
        .from("crm_consultations")
        .insert(batch)
        .select("id");
      if (insertError) {
        console.error("[crm/import-google-sheets] insert error", insertError);
        return NextResponse.json(
          { error: "상담 데이터 저장에 실패했습니다.", detail: insertError.message },
          { status: 500 }
        );
      }
      if (Array.isArray(batchData)) insertedCount += batchData.length;
    }

    const now = new Date().toISOString();
    for (const row of consultationRows) {
      const name = (row.name ?? "").trim() || "—";
      const phone = (row.phone ?? "").trim();
      try {
        if (phone) {
          const { data: existing } = await supabaseAdmin
            .from("crm_customers")
            .select("id")
            .eq("shop_id", shopId)
            .eq("phone", phone)
            .maybeSingle();
          if (existing?.id) {
            await supabaseAdmin
              .from("crm_customers")
              .update({ name, last_seen_at: now, updated_at: now })
              .eq("id", (existing as { id: string }).id);
          } else {
            await supabaseAdmin.from("crm_customers").insert({
              shop_id: shopId,
              name,
              phone,
              first_seen_at: now,
              last_seen_at: now,
              updated_at: now,
            });
          }
        } else {
          await supabaseAdmin.from("crm_customers").insert({
            shop_id: shopId,
            name,
            phone: null,
            first_seen_at: now,
            last_seen_at: now,
            updated_at: now,
          });
        }
      } catch (e) {
        console.warn("[crm/import-google-sheets] crm_customers upsert skip", e);
      }
    }

    return NextResponse.json(
      { success: true, insertedCount, errors },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/crm/import-google-sheets", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
