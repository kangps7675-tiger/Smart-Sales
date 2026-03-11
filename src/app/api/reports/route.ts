import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

type ReportRow = Record<string, unknown> & {
  id?: string;
  shop_id?: string;
  shopId?: string;
};

function normalizeShopFields<T extends ReportRow>(row: T, shopId: string) {
  const next = { ...row } as T;
  if (!next.shop_id) next.shop_id = shopId;
  if (!next.shopId) next.shopId = shopId;
  return next;
}

function getShopIdFromRow(row: ReportRow) {
  return (row.shop_id ?? row.shopId ?? null) as string | null;
}

const CAMEL_TO_SNAKE: Record<string, string> = {
  shopId: "shop_id",
  birthDate: "birth_date",
  saleDate: "sale_date",
  productName: "product_name",
  existingCarrier: "existing_carrier",
  salesPerson: "sales_person",
  planName: "plan_name",
  supportAmount: "support_amount",
  factoryPrice: "factory_price",
  officialSubsidy: "official_subsidy",
  installmentPrincipal: "installment_principal",
  installmentMonths: "installment_months",
  faceAmount: "face_amount",
  verbalA: "verbal_a",
  verbalB: "verbal_b",
  verbalC: "verbal_c",
  verbalD: "verbal_d",
  verbalE: "verbal_e",
  verbalF: "verbal_f",
  activationTime: "activation_time",
  inspectionStore: "inspection_store",
  inspectionOffice: "inspection_office",
  lineType: "line_type",
  saleType: "sale_type",
  serialNumber: "serial_number",
  additionalDiscountIds: "additional_discount_ids",
  additionalDiscountAmount: "additional_discount_amount",
  uploadedAt: "uploaded_at",
};

const SNAKE_TO_CAMEL: Record<string, string> = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE).map(([camel, snake]) => [snake, camel])
);

function normalizeBirthDate(val: unknown): string | null {
  const raw = String(val ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{6}$/.test(raw)) {
    const yy = parseInt(raw.slice(0, 2), 10);
    const fullYear = yy > 30 ? 1900 + yy : 2000 + yy;
    return `${fullYear}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;
  }
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  return raw;
}

/** 클라이언트(camelCase) → DB(snake_case) 변환. insert 시 사용 */
function reportRowToDbRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "id" || k === "uploadedAt") continue;
    const dbKey = CAMEL_TO_SNAKE[k] ?? k;
    if (v === undefined || v === null) continue;
    if (k === "additionalDiscountIds") {
      out[dbKey] = Array.isArray(v) ? v : [];
      continue;
    }
    if (dbKey === "birth_date") {
      out[dbKey] = normalizeBirthDate(v);
      continue;
    }
    out[dbKey] = v;
  }
  if (row.shop_id !== undefined) out.shop_id = row.shop_id;
  if (row.shopId !== undefined && out.shop_id === undefined) out.shop_id = row.shopId;
  return out;
}

/** DB(snake_case) → 클라이언트(camelCase) 변환. select 결과 정규화 */
function dbRowToClientRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const camelKey = SNAKE_TO_CAMEL[k] ?? k;
    out[camelKey] = v;
  }
  if (out.additionalDiscountIds === undefined) {
    out.additionalDiscountIds = Array.isArray(row.additional_discount_ids)
      ? row.additional_discount_ids
      : [];
  }
  if (out.additionalDiscountAmount === undefined) {
    out.additionalDiscountAmount = 0;
  }
  out.additionalDiscountAmount = Number(out.additionalDiscountAmount) || 0;
  const sid = (out.shopId ?? out.shop_id ?? null) as string | null;
  out.shopId = sid;
  out.shop_id = sid;
  return out;
}

// GET /api/reports?shop_id=...
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedShopId = searchParams.get("shop_id");

    let shopIdFilter: string | null = null;

    if (auth.role === "super_admin") {
      shopIdFilter = requestedShopId ? String(requestedShopId).trim() : null;
    } else {
      // tenant_admin / staff
      if (!auth.shopId) return NextResponse.json({ error: "Shop is not set" }, { status: 403 });
      if (requestedShopId && requestedShopId !== auth.shopId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      shopIdFilter = auth.shopId;
    }

    let query = supabaseAdmin.from("reports").select("*");
    if (shopIdFilter) query = query.eq("shop_id", shopIdFilter);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reports", error);
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }

    const normalized = (data ?? []).map((r: Record<string, unknown>) => dbRowToClientRow(r));

    return NextResponse.json(normalized, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in GET /api/reports", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/reports
// body: { reports: ReportRow[] } 또는 [ReportRow, ...]
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const reports = Array.isArray(body) ? body : body.reports;

    if (!Array.isArray(reports) || reports.length === 0) {
      return NextResponse.json(
        { error: 'reports array is required' },
        { status: 400 },
      );
    }

    // 스코프 검증 + shop_id 강제
    const requestedShopId = getShopIdFromRow(reports[0] as ReportRow);
    if (!requestedShopId) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }

    if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== requestedShopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const normalizedReports = (reports as ReportRow[])
      .map((r) => normalizeShopFields(r, requestedShopId))
      .map((r) => {
        const sid = getShopIdFromRow(r);
        if (sid !== requestedShopId) return null;
        return r;
      })
      .filter(Boolean);

    if (normalizedReports.length !== reports.length) {
      return NextResponse.json({ error: "All rows must have the same shop_id" }, { status: 400 });
    }

    const dbRows = normalizedReports.map((r) => reportRowToDbRow(r as Record<string, unknown>));

    const { data, error } = await supabaseAdmin
      .from('reports')
      .insert(dbRows)
      .select('*');

    if (error) {
      console.error('Error inserting reports', error);
      return NextResponse.json(
        { error: 'Failed to insert reports' },
        { status: 500 },
      );
    }

    const inserted = (data ?? []) as { shop_id: string; name?: string; phone?: string }[];
    const now = new Date().toISOString();
    for (const row of inserted) {
      const shopId = row.shop_id;
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
        console.warn("[POST /api/reports] crm_customers upsert skip", e);
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in POST /api/reports', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/reports
// body: { id: string } 또는 { shop_id: string }
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, shop_id } = body as { id?: string; shop_id?: string };

    if (!id && !shop_id) {
      return NextResponse.json(
        { error: 'id or shop_id is required' },
        { status: 400 },
      );
    }

    // 단건 삭제: 기존 로직 유지
    if (id) {
      // 삭제 권한: 해당 shop 스코프 내에서만
      const { data: existing } = await supabaseAdmin
        .from("reports")
        .select("id, shop_id")
        .eq("id", id)
        .maybeSingle();

      const existingShopId = (existing as any)?.shop_id as string | null;
      if (!existingShopId) return NextResponse.json({ error: "Not found" }, { status: 404 });

      if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== existingShopId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { error } = await supabaseAdmin.from("reports").delete().eq("id", id);

      if (error) {
        console.error('Error deleting report', error);
        return NextResponse.json(
          { error: 'Failed to delete report' },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // shop_id 단위 전체 삭제 (한 매장의 업로드를 한 번에 비우고 싶을 때 사용)
    const targetShopId = String(shop_id);

    if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== targetShopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: reportsError } = await supabaseAdmin
      .from("reports")
      .delete()
      .eq("shop_id", targetShopId);

    const { error: uploadsError } = await supabaseAdmin
      .from("report_uploads")
      .delete()
      .eq("shop_id", targetShopId);

    if (reportsError || uploadsError) {
      console.error("Error deleting reports/report_uploads by shop_id", {
        targetShopId,
        reportsError,
        uploadsError,
      });
      return NextResponse.json(
        { error: "Failed to delete reports or upload records by shop_id" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, clearedShopId: targetShopId },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error in DELETE /api/reports', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/reports
// body: { id: string; updates: Partial<ReportRow> }
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, updates } = await req.json();

    if (!id || !updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'id and updates are required' },
        { status: 400 },
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("reports")
      .select("id, shop_id")
      .eq("id", id)
      .maybeSingle();

    const existingShopId = (existing as any)?.shop_id as string | null;
    if (!existingShopId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== existingShopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // shop_id 변경은 금지, camelCase → snake_case
    const allowedKeys: Record<string, string> = {
      name: "name", phone: "phone", birthDate: "birth_date", saleDate: "sale_date",
      productName: "product_name", existingCarrier: "existing_carrier", amount: "amount", margin: "margin",
      salesPerson: "sales_person", planName: "plan_name", supportAmount: "support_amount",
      additionalDiscountIds: "additional_discount_ids", additionalDiscountAmount: "additional_discount_amount",
      address: "address", path: "path", factoryPrice: "factory_price", officialSubsidy: "official_subsidy",
      installmentPrincipal: "installment_principal", installmentMonths: "installment_months",
      faceAmount: "face_amount", verbalA: "verbal_a", verbalB: "verbal_b", verbalC: "verbal_c",
      verbalD: "verbal_d", verbalE: "verbal_e", verbalF: "verbal_f",
      serialNumber: "serial_number", lineType: "line_type", saleType: "sale_type",
      activationTime: "activation_time", inspectionStore: "inspection_store", inspectionOffice: "inspection_office",
    };
    const raw = updates as Record<string, unknown>;
    const safeUpdates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k === "shop_id" || k === "shopId" || k === "id" || k === "uploadedAt") continue;
      const dbKey = allowedKeys[k] ?? k;
      if (v === undefined) continue;
      safeUpdates[dbKey] = k === "additionalDiscountIds" ? (Array.isArray(v) ? v : []) : v;
    }

    const { data, error } = await supabaseAdmin
      .from("reports")
      .update(safeUpdates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error('Error updating report', error);
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 },
      );
    }

    const out = dbRowToClientRow(data as Record<string, unknown>);
    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/reports', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

