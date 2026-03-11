/**
 * 엑셀 파일 파싱 유틸리티
 * 
 * 역할:
 * - 엑셀 파일(.xlsx, .xls)을 읽어서 판매일보 데이터로 변환
 * - 다양한 한글/영문 컬럼명을 자동으로 매핑
 * - 날짜 및 숫자 형식 정규화
 * 
 * @file excel-report.ts
 */

import * as XLSX from "xlsx";
import { parseTabularRowsToReportEntries, type ParseReportResult, type ParseReportOptions } from "@/lib/report-entry-map";

/**
 * 엑셀 파일에서 판매일보 행 추출
 *
 * options.config가 있으면 매장별 컬럼 매핑·마진 계산을 적용하고, 없으면 기본 매핑 사용.
 *
 * @param file - 업로드된 엑셀 파일 객체
 * @param shopId - 판매일보를 등록할 매장 ID
 * @param options - config: 매장별 엑셀 가져오기 설정(선택)
 */
export function parseExcelToReportEntries(
  file: File,
  shopId: string,
  options?: ParseReportOptions
): Promise<ParseReportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (data == null) {
          resolve({ entries: [], errors: ["파일을 읽을 수 없습니다."] });
          return;
        }
        // 한셀/국산 오피스, Google Sheets 등에서 저장한 XLSX/CSV도
        // 최대한 안정적으로 읽기 위해 ArrayBuffer 기반 파싱을 사용한다.
        let workbook = XLSX.read(data, { type: "array", cellDates: true });

        // 시트 이름 목록
        let sheetNames = workbook.SheetNames || [];
        let sheetKeys = Object.keys(workbook.Sheets || {});

        // 일부 환경(특히 한셀/카카오톡에서 저장한 파일)에서는
        // SheetNames는 있는데 Sheets가 비어 있는 케이스가 있어,
        // 그런 경우에는 binary 문자열 기반으로 한 번 더 파싱을 시도한다.
        if (sheetKeys.length === 0 && sheetNames.length > 0 && data instanceof ArrayBuffer) {
          try {
            const binary = Array.from(new Uint8Array(data))
              .map((b) => String.fromCharCode(b))
              .join("");
            const fallbackWb = XLSX.read(binary, { type: "binary", cellDates: true });
            const fallbackSheetKeys = Object.keys(fallbackWb.Sheets || {});
            if (fallbackSheetKeys.length > 0 && (fallbackWb.SheetNames || []).length > 0) {
              workbook = fallbackWb;
              sheetNames = fallbackWb.SheetNames || [];
              sheetKeys = fallbackSheetKeys;
            } else {
              // eslint-disable-next-line no-console
              console.error("[parseExcelToReportEntries] Fallback binary read produced no sheets", {
                fileName: file.name,
                shopId,
                sheetNames: fallbackWb.SheetNames,
                sheetKeys: fallbackSheetKeys,
              });
            }
          } catch (fallbackErr) {
            // eslint-disable-next-line no-console
            console.error("[parseExcelToReportEntries] Fallback binary read error", {
              fileName: file.name,
              shopId,
              error: fallbackErr,
            });
          }
        }

        // SheetNames 배열을 돌면서 실제로 Sheets에 존재하는 첫 번째 시트를 찾는다.
        let firstSheetName: string | undefined;
        let firstSheet: XLSX.WorkSheet | undefined;

        for (const name of sheetNames) {
          const ws = workbook.Sheets[name];
          if (ws) {
            firstSheetName = name;
            firstSheet = ws;
            break;
          }
        }

        // 혹시 그래도 못 찾았으면, Sheets 객체 키를 한 번 더 돌면서 방어적으로 시도
        if (!firstSheet) {
          for (const key of sheetKeys) {
            const ws = (workbook.Sheets as any)[key];
            if (ws) {
              firstSheetName = key;
              firstSheet = ws;
              break;
            }
          }
        }

        if (!firstSheet) {
          // 디버깅용 로그를 조금 더 풍부하게 남김
          // eslint-disable-next-line no-console
          console.error("[parseExcelToReportEntries] No worksheet found", {
            fileName: file.name,
            shopId,
            sheetNames,
            sheetKeys,
          });
          resolve({
            entries: [],
            errors: [
              "엑셀에서 시트를 찾지 못했습니다. 한셀/카카오톡 등에서 저장한 파일일 수 있습니다. ",
              "이 파일을 Microsoft Excel 또는 Google Sheets에서 연 뒤, ",
              "다른 이름으로 저장 → Excel 통합 문서(.xlsx) 또는 CSV로 다시 저장해서 업로드해 주세요.",
            ],
          });
          return;
        }
        
        // 여기서부터는 기존 코드 그대로
        const rows = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: "",
        }) as unknown as unknown[][];
        const { entries, errors } = parseTabularRowsToReportEntries(rows, shopId, options);
        resolve({ entries, errors });
      } catch (err) {
        // 파싱 중 예외 발생 시 에러 반환 (자세한 정보는 콘솔에 남김)
        // eslint-disable-next-line no-console
        console.error("[parseExcelToReportEntries] Excel parse error", {
          fileName: file.name,
          shopId,
          error: err,
        });
        resolve({
          entries: [],
          errors: [err instanceof Error ? err.message : "엑셀 파싱 중 오류가 발생했습니다."],
        });
      }
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    // 최신 권장 방식: ArrayBuffer로 읽고 type: "array"로 파싱
    reader.readAsArrayBuffer(file);
  });
}
