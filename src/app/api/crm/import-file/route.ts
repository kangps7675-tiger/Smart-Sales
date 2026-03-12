import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import iconv from "iconv-lite";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";
import {
  parseTabularRowsToReportEntries,
  type ParseReportOptions,
  type ReportImportConfig,
} from "@/lib/report-entry-map";

export const dynamic = "force-dynamic";

const INFLOW_OPTIONS = ["로드", "컨택", "전화", "온라인", "지인"] as const;

function getFileExt(name: string) {
  const lowered = name.toLowerCase().trim();
  if (lowered.endsWith(".xlsx")) return "xlsx";
  if (lowered.endsWith(".xls")) return "xls";
  if (lowered.endsWith(".csv")) return "csv";
  return "unknown";
}

function pickWorksheet(workbook: XLSX.WorkBook, preferredNames?: string[]) {
  const sheetNames = workbook.SheetNames || [];
  const sheets = workbook.Sheets || {};

  if (preferredNames?.length) {
    for (const preferred of preferredNames) {
      const lower = preferred.toLowerCase();
      const match = sheetNames.find((n) => n.toLowerCase().includes(lower));
      if (match && sheets[match]) return { sheetName: match, worksheet: sheets[match], sheetNames };
    }
  }

  for (const name of sheetNames) {
    if (sheets[name]) return { sheetName: name, worksheet: sheets[name], sheetNames };
  }
  return { sheetName: null as string | null, worksheet: null as XLSX.WorkSheet | null, sheetNames };
}

function readWorksheetCells(worksheet: XLSX.WorkSheet): unknown[][] {
  const ref = worksheet["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const rows: unknown[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: unknown[] = [];
    let hasContent = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[addr] as { w?: string; v?: unknown } | undefined;
      if (cell) {
        const val = cell.w !== undefined ? cell.w : (cell.v ?? "");
        row.push(val);
        if (val !== "" && val !== null && val !== undefined) hasContent = true;
      } else {
        row.push("");
      }
    }
    if (hasContent) rows.push(row);
  }
  return rows;
}

function xlsxToRows(worksheet: XLSX.WorkSheet): unknown[][] {
  const direct = readWorksheetCells(worksheet);
  const hasText = direct.some((row) =>
    (row as unknown[]).some((c) => typeof c === "string" && c.trim().length > 0)
  );
  if (hasText) return direct;

  const csvText = XLSX.utils.sheet_to_csv(worksheet, { blankrows: false });
  const csvWb = XLSX.read(csvText, { type: "string" });
  const csvWs = csvWb.Sheets[csvWb.SheetNames[0]];
  if (!csvWs) return direct;
  return XLSX.utils.sheet_to_json(csvWs, { header: 1, defval: "" }) as unknown[][];
}

function excelSerialToDate(serial: number): string {
  const utcDays = Math.floor(serial) - 25569;
  const d = new Date(utcDays * 86400000);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function normalizeExcelDates(rows: unknown[][]) {
  for (const row of rows) {
    for (let i = 0; i < (row as unknown[]).length; i++) {
      const cell = (row as unknown[])[i];
      if (cell instanceof Date) {
        (row as unknown[])[i] = cell.toISOString().slice(0, 10);
      } else if (typeof cell === "number" && cell > 35000 && cell < 55000) {
        (row as unknown[])[i] = excelSerialToDate(cell);
      }
    }
  }
}

function decodeCsvText(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.toString("utf8");
  }
  const utf8 = buffer.toString("utf8");
  if (utf8.includes("\uFFFD")) {
    try {
      return iconv.decode(buffer, "cp949");
    } catch {
      return utf8;
    }
  }
  return utf8;
}

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

/** 엑셀 행(entry) → crm_consultations insert 행 */
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
  const inflow_type = path && INFLOW_OPTIONS.includes(path as (typeof INFLOW_OPTIONS)[number])
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

    const formData = await req.formData();
    const shopId = String(formData.get("shop_id") ?? "").trim();
    const file = formData.get("file");

    if (!shopId) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (auth.role === "tenant_admin" || auth.role === "staff") {
      if (auth.shopId !== shopId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    if (auth.role !== "super_admin" && auth.role !== "tenant_admin" && auth.role !== "staff") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExt = getFileExt(file.name);

    let rows: unknown[][];

    if (fileExt === "csv") {
      const csvText = decodeCsvText(buffer);
      const csvWorkbook = XLSX.read(csvText, { type: "string" });
      const csvPicked = pickWorksheet(csvWorkbook);
      if (!csvPicked.worksheet) {
        return NextResponse.json(
          { error: "CSV 파싱에 실패했습니다. 파일을 확인해 주세요." },
          { status: 400 },
        );
      }
      rows = XLSX.utils.sheet_to_json(csvPicked.worksheet, {
        header: 1,
        defval: "",
      }) as unknown[][];
    } else if (fileExt === "xlsx" || fileExt === "xls") {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const picked = pickWorksheet(workbook, ["crm", "CRM", "상담", "고객"]);
      if (!picked.worksheet) {
        return NextResponse.json(
          { error: "엑셀에서 시트를 찾지 못했습니다. CSV로 저장해서 업로드해 주세요." },
          { status: 400 },
        );
      }
      rows = xlsxToRows(picked.worksheet);
      normalizeExcelDates(rows);
    } else {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다. xlsx/xls/csv만 가능합니다." },
        { status: 400 },
      );
    }

    const importConfig = await getReportImportConfig(shopId);
    const options: ParseReportOptions = { config: importConfig ?? undefined };

    const maxHeaderRow = Math.min(30, Math.max(0, rows.length - 2));
    let bestResult = parseTabularRowsToReportEntries(rows, shopId, options);

    if (bestResult.entries.length === 0 && maxHeaderRow >= 1) {
      for (let startRow = 1; startRow <= maxHeaderRow; startRow++) {
        const candidateRows = [rows[startRow], ...rows.slice(startRow + 1)] as unknown[][];
        if (candidateRows.length < 2) break;
        const parsed = parseTabularRowsToReportEntries(candidateRows, shopId, options);
        if (parsed.entries.length > 0) {
          bestResult = parsed;
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
        const parsed = parseTabularRowsToReportEntries(candidateRows, shopId, options);
        if (parsed.entries.length > 0) {
          bestResult = parsed;
          break;
        }
      }
    }

    const { entries, errors, detectedHeaders } = bestResult;

    if (entries.length === 0) {
      return NextResponse.json(
        {
          error: errors.join(" ") || "추출된 데이터가 없습니다. 첫 행 헤더를 확인해 주세요.",
          errors,
          detectedHeaders: detectedHeaders ?? undefined,
        },
        { status: 400 }
      );
    }

    const consultationRows = entries.map((e) =>
      entryToConsultationRow({ ...e, shop_id: shopId, shopId } as Record<string, unknown> & { shop_id: string; shopId: string }, shopId)
    );

    // 기존 CRM 데이터(예정건 포함) 전부 삭제 후 새 데이터로 교체
    const { error: deleteError } = await supabaseAdmin
      .from("crm_consultations")
      .delete()
      .eq("shop_id", shopId);

    if (deleteError) {
      console.error("[crm/import-file] delete existing consultations", deleteError);
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
        console.error("[crm/import-file] insert crm_consultations", insertError);
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
        console.warn("[crm/import-file] crm_customers upsert skip", e);
      }
    }

    return NextResponse.json(
      {
        success: true,
        insertedCount,
        errors,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/crm/import-file", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
