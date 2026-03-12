/**
 * xlsx/xls 파일을 CSV 문자열로만 변환하는 API
 * 클라이언트 변환이 실패할 때(한셀 등) 서버에서 변환해 CSV를 반환한다.
 * import API는 항상 CSV만 받도록 하고, 이 API는 변환만 담당한다.
 */

import { writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

function getFileExt(name: string) {
  const lowered = name.toLowerCase().trim();
  if (lowered.endsWith(".xlsx")) return "xlsx";
  if (lowered.endsWith(".xls")) return "xls";
  if (lowered.endsWith(".csv")) return "csv";
  return "unknown";
}

function pickFirstWorksheet(workbook: XLSX.WorkBook): { worksheet: XLSX.WorkSheet | null } {
  const sheetNames = workbook.SheetNames ?? [];
  for (const name of sheetNames) {
    const ws = workbook.Sheets?.[name];
    if (ws) return { worksheet: ws };
  }
  const sheetKeys = Object.keys(workbook.Sheets ?? {});
  for (const key of sheetKeys) {
    const ws = (workbook.Sheets as Record<string, XLSX.WorkSheet>)[key];
    if (ws) return { worksheet: ws };
  }
  const firstVal = Object.values(workbook.Sheets ?? {})[0];
  if (firstVal && typeof firstVal === "object" && "!ref" in firstVal) {
    return { worksheet: firstVal as XLSX.WorkSheet };
  }
  return { worksheet: null };
}

const XLSX_OPTS = {
  cellDates: true as const,
  cellFormula: false,
  cellHTML: false,
  bookVBA: false,
};

/** buffer로부터 워크북을 읽고, 여러 방식 시도(한셀/대용량 등 호환) */
function readWorkbook(buffer: Buffer): XLSX.WorkBook | null {
  const attempts: Array<{ type: "buffer" | "array" | "binary" | "base64"; data: Buffer | Uint8Array | string }> = [
    { type: "buffer", data: buffer },
    { type: "array", data: new Uint8Array(buffer) },
    {
      type: "binary",
      data: Array.from(buffer)
        .map((b) => String.fromCharCode(b))
        .join(""),
    },
    { type: "base64", data: buffer.toString("base64") },
  ];

  for (const { type, data } of attempts) {
    try {
      const wb = XLSX.read(data as never, { type, ...XLSX_OPTS });
      if (pickFirstWorksheet(wb).worksheet) return wb;
    } catch {
      // 다음 방식 시도
    }
  }

  // 임시 파일로 저장 후 readFile 시도 (일부 xlsx는 파일 경로로 읽을 때만 시트가 채워짐)
  const tmpPath = join(tmpdir(), `xlsx-${randomBytes(8).toString("hex")}.xlsx`);
  try {
    writeFileSync(tmpPath, buffer);
    const wb = XLSX.readFile(tmpPath, XLSX_OPTS);
    if (pickFirstWorksheet(wb).worksheet) return wb;
  } catch {
    // 무시
  } finally {
    if (existsSync(tmpPath)) {
      try {
        unlinkSync(tmpPath);
      } catch {
        // 정리 실패 무시
      }
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const ext = getFileExt(file.name);
    if (ext === "csv") {
      const text = await file.text();
      return NextResponse.json({ csv: text });
    }
    if (ext !== "xlsx" && ext !== "xls") {
      return NextResponse.json(
        { error: "xlsx 또는 xls 파일만 변환 가능합니다." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = readWorkbook(buffer);
    if (!workbook) {
      return NextResponse.json(
        { error: "시트를 읽을 수 없습니다. Excel에서 다른 이름으로 저장 → Excel 통합 문서(.xlsx)로 다시 저장 후 시도해 주세요." },
        { status: 400 }
      );
    }
    const { worksheet } = pickFirstWorksheet(workbook);
    if (!worksheet) {
      return NextResponse.json(
        { error: "시트를 읽을 수 없습니다. Excel에서 다른 이름으로 저장 → Excel 통합 문서(.xlsx)로 다시 저장 후 시도해 주세요." },
        { status: 400 }
      );
    }
    const csv = XLSX.utils.sheet_to_csv(worksheet, { blankrows: false });
    return NextResponse.json({ csv });
  } catch (err) {
    console.error("[convert-excel-to-csv]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "변환 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
