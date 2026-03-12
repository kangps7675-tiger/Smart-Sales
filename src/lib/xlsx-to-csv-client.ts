/**
 * 클라이언트에서 xlsx/xls 파일을 CSV로 변환하는 유틸
 *
 * - 업로드 시 .xlsx/.xls → 첫 시트를 CSV로 변환해 서버에 CSV로 전달
 * - 서버는 항상 CSV 경로로 파싱하므로 인코딩·시트 선택 동작을 통일할 수 있음
 *
 * @file xlsx-to-csv-client.ts
 */

import * as XLSX from "xlsx";

/**
 * xlsx/xls 파일을 CSV File로 변환합니다. 이미 CSV면 그대로 반환합니다.
 * 브라우저 전용 (FileReader 사용).
 */
export function convertExcelFileToCsv(file: File): Promise<File> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    return Promise.resolve(file);
  }
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return Promise.reject(new Error("엑셀/CSV 파일만 변환 가능합니다."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (data == null) {
          reject(new Error("파일을 읽을 수 없습니다."));
          return;
        }
        let workbook = XLSX.read(data, { type: "array", cellDates: true });
        let sheetNames = workbook.SheetNames ?? [];
        let sheetKeys = Object.keys(workbook.Sheets ?? {});

        // 한셀/국산 오피스 등: SheetNames는 있는데 Sheets가 비어 있는 경우 binary로 재파싱 시도
        if (sheetKeys.length === 0 && sheetNames.length > 0 && data instanceof ArrayBuffer) {
          try {
            const binary = Array.from(new Uint8Array(data))
              .map((b) => String.fromCharCode(b))
              .join("");
            const fallbackWb = XLSX.read(binary, { type: "binary", cellDates: true });
            const fallbackKeys = Object.keys(fallbackWb.Sheets ?? {});
            if (fallbackKeys.length > 0 && (fallbackWb.SheetNames ?? []).length > 0) {
              workbook = fallbackWb;
              sheetNames = fallbackWb.SheetNames ?? [];
              sheetKeys = fallbackKeys;
            }
          } catch {
            // fallback 실패 시 아래에서 시트 없음으로 처리됨
          }
        }

        // SheetNames 중 실제로 Sheets에 존재하는 첫 시트 사용 (없으면 Sheets 키/값 순서로 시도)
        let worksheet: XLSX.WorkSheet | null = null;
        const sheetsObj = workbook.Sheets ?? {};
        for (const name of sheetNames) {
          const ws = sheetsObj[name];
          if (ws) {
            worksheet = ws;
            break;
          }
        }
        if (!worksheet && sheetKeys.length > 0) {
          const firstKey = sheetKeys[0];
          if (firstKey && sheetsObj[firstKey]) worksheet = sheetsObj[firstKey];
        }
        if (!worksheet) {
          const firstVal = Object.values(sheetsObj)[0];
          if (firstVal && typeof firstVal === "object" && "!ref" in firstVal) worksheet = firstVal as XLSX.WorkSheet;
        }

        // 배열·바이너리로도 시트를 못 찾으면 base64로 한 번 더 시도 (일부 xlsx 호환)
        if (!worksheet && data instanceof ArrayBuffer && typeof btoa !== "undefined") {
          try {
            const bytes = new Uint8Array(data);
            let binary = "";
            const chunk = 8192;
            for (let i = 0; i < bytes.length; i += chunk) {
              const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
              for (let j = 0; j < slice.length; j++) binary += String.fromCharCode(slice[j]);
            }
            const b64 = btoa(binary);
            const wb2 = XLSX.read(b64, { type: "base64", cellDates: true });
            const keys2 = Object.keys(wb2.Sheets ?? {});
            const names2 = wb2.SheetNames ?? [];
            for (const name of names2) {
              const ws = wb2.Sheets?.[name];
              if (ws) {
                worksheet = ws;
                workbook = wb2;
                break;
              }
            }
            if (!worksheet && keys2.length > 0 && wb2.Sheets?.[keys2[0]])
              worksheet = wb2.Sheets[keys2[0]];
          } catch {
            // base64 폴백 실패
          }
        }

        if (!worksheet) {
          reject(new Error("시트를 읽을 수 없습니다. 다른 이름으로 저장 → Excel 통합 문서(.xlsx) 또는 CSV로 다시 저장해서 업로드해 주세요."));
          return;
        }
        const csvText = XLSX.utils.sheet_to_csv(worksheet, { blankrows: false });
        const baseName = file.name.replace(/\.(xlsx|xls)$/i, "");
        const csvFile = new File([csvText], `${baseName}.csv`, { type: "text/csv" });
        resolve(csvFile);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 클라이언트에서 xlsx→CSV 변환을 시도하고, 실패 시 서버 API로 변환합니다.
 * 항상 CSV File만 반환하며, import API에는 CSV만 전달됩니다.
 */
export async function convertExcelFileToCsvWithServerFallback(file: File): Promise<File> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return file;
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    throw new Error("엑셀/CSV 파일만 변환 가능합니다.");
  }

  try {
    return await convertExcelFileToCsv(file);
  } catch {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/convert-excel-to-csv", { method: "POST", body: form });
    const json = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok) {
      throw new Error(
        (json?.error as string) ?? "서버에서 엑셀 변환에 실패했습니다. Excel에서 다른 이름으로 저장 → Excel 통합 문서(.xlsx)로 다시 저장 후 시도해 주세요."
      );
    }
    const csv = String(json?.csv ?? "");
    const baseName = file.name.replace(/\.(xlsx|xls)$/i, "");
    return new File([csv], `${baseName}.csv`, { type: "text/csv" });
  }
}
