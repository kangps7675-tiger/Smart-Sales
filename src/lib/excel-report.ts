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
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) {
          resolve({ entries: [], errors: ["시트가 없습니다."] });
          return;
        }
        const rows = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: "",
        }) as unknown as unknown[][];
        const { entries, errors } = parseTabularRowsToReportEntries(rows, shopId, options);
        resolve({ entries, errors });
      } catch (err) {
        // 파싱 중 예외 발생 시 에러 반환
        resolve({
          entries: [],
          errors: [err instanceof Error ? err.message : "엑셀 파싱 중 오류가 발생했습니다."],
        });
      }
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsBinaryString(file); // 바이너리 형식으로 파일 읽기 시작
  });
}
