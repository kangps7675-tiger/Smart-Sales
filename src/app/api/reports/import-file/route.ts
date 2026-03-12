import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import * as XLSX from "xlsx";
import iconv from "iconv-lite";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";
import {
  parseTabularRowsToReportEntries,
  findReportTableInSheet,
  type ParseReportOptions,
  type ReportImportConfig,
} from "@/lib/report-entry-map";

export const dynamic = "force-dynamic";

type ReportRow = Record<string, unknown> & {
  shop_id?: string;
  shopId?: string;
};

function getFileExt(name: string) {
  const lowered = name.toLowerCase().trim();
  if (lowered.endsWith(".xlsx")) return "xlsx";
  if (lowered.endsWith(".xls")) return "xls";
  if (lowered.endsWith(".csv")) return "csv";
  return "unknown";
}

const SALE_DATE_DB_KEYS = new Set(["sale_date"]);

function reportRowToDbRow(row: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
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
    additionalDiscountAmount: "additional_discount_amount",
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "id" || k === "uploadedAt") continue;
    const dbKey = map[k] ?? k;
    if (v === undefined || v === null) continue;
    const val = v;
    if (dbKey === "birth_date") {
      const raw = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        out[dbKey] = raw.slice(0, 10);
      } else if (/^\d{6}$/.test(raw)) {
        const yy = parseInt(raw.slice(0, 2), 10);
        const fullYear = yy > 30 ? 1900 + yy : 2000 + yy;
        out[dbKey] = `${fullYear}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;
      } else if (/^\d{8}$/.test(raw)) {
        out[dbKey] = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      } else {
        out[dbKey] = raw || null;
      }
    } else if (SALE_DATE_DB_KEYS.has(dbKey)) {
      const str = String(val).trim();
      out[dbKey] = str && /^\d{4}-\d{2}-\d{2}/.test(str) ? str.slice(0, 10) : new Date().toISOString().slice(0, 10);
    } else {
      out[dbKey] = val;
    }
  }
  if (row.shop_id !== undefined) out.shop_id = row.shop_id;
  if (row.shopId !== undefined && out.shop_id === undefined) out.shop_id = row.shopId;
  return out;
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
  // UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.toString("utf8");
  }
  const utf8 = buffer.toString("utf8");
  // 한셀/윈도우 CSV가 CP949인 경우가 많아서, UTF-8 디코딩 결과에 �가 섞이면 CP949로 재시도
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

async function checkAndRecordUpload(shopId: string, fileHash: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("report_uploads")
      .select("id")
      .eq("shop_id", shopId)
      .eq("file_hash", fileHash)
      .maybeSingle();
    if (!error && data) return { duplicate: true as const };
    // 테이블이 없거나 오류면 dedupe 비활성으로 처리
    if (error && !data) return { duplicate: false as const, dedupeDisabled: true as const };
    const { error: insertError } = await supabaseAdmin.from("report_uploads").insert({
      shop_id: shopId,
      file_hash: fileHash,
      uploaded_at: new Date().toISOString(),
    });
    if (insertError) return { duplicate: false as const, dedupeDisabled: true as const };
    return { duplicate: false as const };
  } catch {
    return { duplicate: false as const, dedupeDisabled: true as const };
  }
}

async function clearShopReports(shopId: string) {
  const { error: reportsError } = await supabaseAdmin
    .from("reports")
    .delete()
    .eq("shop_id", shopId);
  const { error: uploadsError } = await supabaseAdmin
    .from("report_uploads")
    .delete()
    .eq("shop_id", shopId);
  return { reportsError, uploadsError };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await req.formData();
    const shopId = String(formData.get("shop_id") ?? "").trim();
    const overwrite = String(formData.get("overwrite") ?? "true") === "true";
    const file = formData.get("file");

    if (!shopId) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (auth.role === "tenant_admin" && auth.shopId !== shopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExt = getFileExt(file.name);
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    const dedupe = await checkAndRecordUpload(shopId, fileHash);
    if (dedupe.duplicate) {
      if (!overwrite) {
        return NextResponse.json(
          { error: "이미 업로드한 파일입니다.", duplicate: true },
          { status: 409 },
        );
      }
      const cleared = await clearShopReports(shopId);
      if (cleared.reportsError || cleared.uploadsError) {
        console.error("[import-file] clearShopReports failed", {
          shopId,
          reportsError: cleared.reportsError,
          uploadsError: cleared.uploadsError,
        });
        return NextResponse.json(
          { error: "기존 데이터 삭제에 실패했습니다." },
          { status: 500 },
        );
      }
      // 삭제 후 업로드 이력도 지워졌으니 다시 기록
      await checkAndRecordUpload(shopId, fileHash);
    }

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
      const picked = pickWorksheet(workbook, ["판매일보", "판매", "일보", "sales", "report"]);
      if (!picked.worksheet) {
        console.error("[import-file] No worksheet found in workbook", {
          fileName: file.name,
          shopId,
          sheetNames: picked.sheetNames,
        });
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

    // 시트 전체를 스캔해 판매일보 표(고객정보·상품·요금제·마진 4파트)를 찾아 헤더+데이터로 파싱
    const reportTable = findReportTableInSheet(rows);

    // ===== 집중 진단 =====
    if (reportTable && reportTable.length >= 2) {
      const detectedH = (reportTable[0] as unknown[]).map((c) => String(c ?? "").trim());
      const modelIdx = detectedH.findIndex((h) => /모델|개통단말|product/i.test(h));
      const serialIdx = detectedH.findIndex((h) => /일련번호|serial/i.test(h));
      const firstDataRow = reportTable.length > 1 ? (reportTable[1] as unknown[]) : [];
      console.warn("===== [import-file] 헤더 진단 =====");
      console.warn("  감지된 헤더(처음30개):", detectedH.slice(0, 30).join(" | "));
      console.warn(`  모델 컬럼: idx=${modelIdx}, header="${detectedH[modelIdx] ?? "N/A"}", 첫행값="${firstDataRow[modelIdx] ?? "N/A"}"`);
      console.warn(`  일련번호 컬럼: idx=${serialIdx}, header="${detectedH[serialIdx] ?? "N/A"}", 첫행값="${firstDataRow[serialIdx] ?? "N/A"}"`);
      console.warn("  총 데이터 행:", reportTable.length - 1);
      console.warn("===================================");
    } else {
      console.warn("[import-file] findReportTableInSheet → null. rows.length =", rows.length);
      if (rows.length > 0) {
        console.warn("  첫 행(처음20개):", (rows[0] as unknown[]).slice(0, 20).map((c) => String(c ?? "").trim()).join(" | "));
      }
    }
    // ===== 진단 끝 =====

    let bestResult =
      reportTable && reportTable.length >= 2
        ? parseTabularRowsToReportEntries(reportTable as unknown[][], shopId, options)
        : parseTabularRowsToReportEntries(rows, shopId, options);

    const maxHeaderRow = Math.min(30, Math.max(0, rows.length - 2));
    if (bestResult.entries.length === 0) {
      bestResult = parseTabularRowsToReportEntries(rows, shopId, options);
    }
    if (bestResult.entries.length === 0 && maxHeaderRow >= 1) {
      for (let startRow = 1; startRow <= maxHeaderRow; startRow++) {
        const candidateRows = [rows[startRow], ...rows.slice(startRow + 1)] as unknown[][];
        if (candidateRows.length < 2) break;
        const parsed = parseTabularRowsToReportEntries(candidateRows, shopId, options);
        if (parsed.entries.length > 0) {
          bestResult = parsed;
          break;
        }
        const headerRow = (candidateRows[0] as unknown[]).map((h) => String(h ?? "").trim());
        if (headerRow.some((h) => h.length > 0)) {
          bestResult = { ...parsed, detectedHeaders: headerRow };
        }
      }
    }

    // 2행 헤더: 위쪽 행은 그룹명(고객정보·상품 등), 바로 아래 행이 실제 컬럼명(고객명·전화번호 등). 여러 시작 위치 시도
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
        if (combinedHeader.some((h) => h.length > 0)) {
          bestResult = { ...parsed, detectedHeaders: combinedHeader };
        }
      }
    }

    const { entries, errors, detectedHeaders, headerMapping } = bestResult;

    const productNameMapped = headerMapping?.find((m) => m.mappedTo === "productName");
    const serialMapped = headerMapping?.find((m) => m.mappedTo === "serialNumber");
    const sampleProductName = entries.length > 0 ? (entries[0] as Record<string, unknown>).productName : undefined;
    const sampleSerial = entries.length > 0 ? (entries[0] as Record<string, unknown>).serialNumber : undefined;

    // 매핑 결과 진단
    console.warn("===== [import-file] 매핑 결과 =====");
    console.warn(`  총 entries: ${entries.length}`);
    console.warn(`  productName 매핑: ${productNameMapped ? `"${productNameMapped.header}" → productName` : "❌ 없음"}`);
    console.warn(`  serialNumber 매핑: ${serialMapped ? `"${serialMapped.header}" → serialNumber` : "❌ 없음"}`);
    console.warn(`  첫 entry productName: "${sampleProductName ?? ""}"`);
    console.warn(`  첫 entry serialNumber: "${sampleSerial ?? ""}"`);
    if (entries.length > 0) {
      const nonEmptyPN = entries.filter((e) => (e as Record<string, unknown>).productName).length;
      console.warn(`  productName 있는 행: ${nonEmptyPN}/${entries.length}`);
    }
    if (headerMapping) {
      const mapped = headerMapping.filter((m) => m.mappedTo !== "(unmapped)");
      console.warn(`  전체 매핑: ${mapped.map((m) => `${m.header}→${m.mappedTo}`).join(", ")}`);
    }
    console.warn("===================================");

    if (entries.length === 0) {
      const sampleLines = rows.slice(0, 10).map((r, idx) => {
        const cells = (r as unknown[]).slice(0, 20).map((c) => String(c ?? "").trim());
        const preview = cells.filter(Boolean).slice(0, 8).join(" | ");
        return preview ? `행${idx}: ${preview}` : null;
      }).filter(Boolean);
      const sampleText = sampleLines.length > 0
        ? ` ── 파일 내용(${rows.length}행): ${sampleLines.join(" / ")}`
        : ` (${rows.length}행, 내용 없음)`;
      const baseError = errors.join(" ") || "매핑된 고객 데이터가 없습니다.";
      console.warn("[import-file] No mapped rows", {
        totalRows: rows.length,
        fileExt,
        sampleLines,
      });
      return NextResponse.json(
        {
          error: `${baseError}${sampleText}`,
          errors,
          detectedHeaders: detectedHeaders ?? undefined,
        },
        { status: 400 },
      );
    }

    // 3) DB 저장 (reports) — 대량일 때 배치로 나눠 insert (타임아웃/페이로드 방지)
    const dbRows = entries.map((e) => reportRowToDbRow(e as unknown as Record<string, unknown>));
    const BATCH_SIZE = 80;
    const inserted: { shop_id: string; name?: string; phone?: string }[] = [];
    for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
      const batch = dbRows.slice(i, i + BATCH_SIZE);
      const { data: batchData, error: insertError } = await supabaseAdmin
        .from("reports")
        .insert(batch)
        .select("shop_id, name, phone");

      if (insertError) {
        console.error("[import-file] Error inserting reports", insertError.message, insertError.code, insertError.details);
        return NextResponse.json(
          {
            error: "Failed to insert reports",
            detail: insertError.message,
            code: insertError.code,
          },
          { status: 500 }
        );
      }
      if (Array.isArray(batchData)) inserted.push(...(batchData as { shop_id: string; name?: string; phone?: string }[]));
    }
    // CRM 고객 upsert (기존 /api/reports POST와 동일)
    const now = new Date().toISOString();
    for (const row of inserted) {
      const sid = row.shop_id;
      const name = (row.name ?? "").trim() || "—";
      const phone = (row.phone ?? "").trim();
      try {
        if (phone) {
          const { data: existing } = await supabaseAdmin
            .from("crm_customers")
            .select("id")
            .eq("shop_id", sid)
            .eq("phone", phone)
            .maybeSingle();
          if (existing?.id) {
            await supabaseAdmin
              .from("crm_customers")
              .update({ name, last_seen_at: now, updated_at: now })
              .eq("id", (existing as { id: string }).id);
          } else {
            await supabaseAdmin.from("crm_customers").insert({
              shop_id: sid,
              name,
              phone,
              first_seen_at: now,
              last_seen_at: now,
              updated_at: now,
            });
          }
        } else {
          await supabaseAdmin.from("crm_customers").insert({
            shop_id: sid,
            name,
            phone: null,
            first_seen_at: now,
            last_seen_at: now,
            updated_at: now,
          });
        }
      } catch (e) {
        console.warn("[import-file] crm_customers upsert skip", e);
      }
    }

    // 첫 DB row에서 product_name 확인
    const dbSampleProductName = dbRows.length > 0 ? (dbRows[0] as Record<string, unknown>).product_name : undefined;

    return NextResponse.json(
      {
        success: true,
        insertedCount: inserted.length,
        errors,
        duplicate: dedupe.duplicate ?? false,
        dedupeDisabled: (dedupe as any).dedupeDisabled ?? false,
        _debug: {
          headerMapping: headerMapping?.filter((m) => m.mappedTo !== "(unmapped)"),
          productNameColumn: productNameMapped ?? null,
          sampleProductName,
          dbSampleProductName,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Unexpected error in POST /api/reports/import-file", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

