import { NextRequest, NextResponse } from "next/server";
import {
  parseTabularRowsToReportEntries,
  findReportTableInSheet,
  type ParseReportOptions,
  type ReportImportConfig,
} from "@/lib/report-entry-map";
import { fetchSheetRows } from "@/lib/google-sheets";
import { getAuthContext } from "@/server/auth";
import { supabaseAdmin } from "@/server/supabase";

export const dynamic = "force-dynamic";

// POST /api/reports/import-google-sheets
// body: { shop_id: string, url: string }
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const shopId = String(body?.shop_id ?? "").trim();
    const url = String(body?.url ?? "").trim();

    if (!shopId || !url) {
      return NextResponse.json(
        { error: "shop_id and url are required" },
        { status: 400 },
      );
    }

    if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== shopId) {
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

    const { rows, sheetId: parsedSheetId, gid: parsedGid } = sheetResult;

    let importConfig: ReportImportConfig | null = null;
    const { data: settings } = await supabaseAdmin
      .from("shop_settings")
      .select("report_import_config")
      .eq("shop_id", shopId)
      .maybeSingle();
    if (settings?.report_import_config && typeof settings.report_import_config === "object") {
      importConfig = settings.report_import_config as ReportImportConfig;
    }

    const options: ParseReportOptions = { config: importConfig ?? undefined };

    const reportTable = findReportTableInSheet(rows);

    // ===== 집중 진단 =====
    if (reportTable && reportTable.length >= 2) {
      const detectedH = (reportTable[0] as unknown[]).map((c) => String(c ?? "").trim());
      const modelIdx = detectedH.findIndex((h) => /모델|개통단말|product/i.test(h));
      const serialIdx = detectedH.findIndex((h) => /일련번호|serial/i.test(h));
      const firstDataRow = reportTable.length > 1 ? (reportTable[1] as unknown[]) : [];
      console.warn("===== [import-google-sheets] 헤더 진단 =====");
      console.warn("  감지된 헤더(처음30개):", detectedH.slice(0, 30).join(" | "));
      console.warn(`  모델 컬럼: idx=${modelIdx}, header="${detectedH[modelIdx] ?? "N/A"}", 첫행값="${firstDataRow[modelIdx] ?? "N/A"}"`);
      console.warn(`  일련번호 컬럼: idx=${serialIdx}, header="${detectedH[serialIdx] ?? "N/A"}", 첫행값="${firstDataRow[serialIdx] ?? "N/A"}"`);
      console.warn("  총 데이터 행:", reportTable.length - 1);
      console.warn("=============================================");
    } else {
      console.warn("[import-google-sheets] findReportTableInSheet → null. rows.length =", rows.length);
      if (rows.length > 0) {
        console.warn("  첫 행(처음20개):", (rows[0] as unknown[]).slice(0, 20).map((c) => String(c ?? "").trim()).join(" | "));
      }
    }
    // ===== 진단 끝 =====

    let bestResult =
      reportTable && reportTable.length >= 2
        ? parseTabularRowsToReportEntries(reportTable as unknown[][], shopId, options)
        : parseTabularRowsToReportEntries(rows, shopId, options);

    if (bestResult.entries.length === 0) {
      bestResult = parseTabularRowsToReportEntries(rows, shopId, options);
    }

    const maxHeaderRow = Math.min(30, Math.max(0, rows.length - 2));
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
          String((r1[i] ?? "") || (r0[i] ?? "")).trim(),
        );
        const candidateRows = [combinedHeader, ...rows.slice(start + 2)] as unknown[][];
        const parsed = parseTabularRowsToReportEntries(candidateRows, shopId, options);
        if (parsed.entries.length > 0) {
          bestResult = parsed;
          break;
        }
      }
    }

    const { entries, errors, headerMapping } = bestResult;

    // 매핑 결과 진단
    const productNameMapped = headerMapping?.find((m) => m.mappedTo === "productName");
    const serialMapped = headerMapping?.find((m) => m.mappedTo === "serialNumber");
    const sampleProductName = entries.length > 0 ? (entries[0] as Record<string, unknown>).productName : undefined;
    const sampleSerial = entries.length > 0 ? (entries[0] as Record<string, unknown>).serialNumber : undefined;

    console.warn("===== [import-google-sheets] 매핑 결과 =====");
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
    console.warn("=============================================");

    return NextResponse.json(
      {
        meta: { sheet_id: parsedSheetId, gid: parsedGid ?? null },
        entries,
        errors,
        _debug: {
          headerMapping: headerMapping?.filter((m) => m.mappedTo !== "(unmapped)"),
          productNameColumn: productNameMapped ?? null,
          sampleProductName,
          sampleSerial,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Unexpected error in POST /api/reports/import-google-sheets", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

