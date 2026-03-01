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
import type { ReportEntry } from "@/client/store/useReportsStore";
import { parseTabularRowsToReportEntries, type ParseReportResult } from "@/lib/report-entry-map";

/**
 * 엑셀 파일에서 판매일보 행 추출
 * 
 * 동작:
 * 1. 첫 번째 시트의 첫 행을 헤더로 인식
 * 2. HEADER_MAP을 사용하여 컬럼명을 내부 필드로 매핑
 * 3. 각 행을 ReportEntry 형태로 변환
 * 4. 이름 또는 연락처가 있는 행만 유효한 데이터로 처리
 * 
 * @param file - 업로드된 엑셀 파일 객체
 * @param shopId - 판매일보를 등록할 매장 ID
 * @returns Promise<ParseReportResult> - 파싱된 항목 배열과 에러 메시지
 */
export function parseExcelToReportEntries(
  file: File,
  shopId: string
): Promise<ParseReportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // 파일 읽기 실패 체크
        if (data == null) {
          resolve({ entries: [], errors: ["파일을 읽을 수 없습니다."] });
          return;
        }
        // 엑셀 파일 파싱 (바이너리 형식으로 읽기)
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        // 첫 번째 시트 가져오기
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) {
          resolve({ entries: [], errors: ["시트가 없습니다."] });
          return;
        }
        // 시트를 배열 형태로 변환 (header: 1이면 행이 배열로 반환됨)
        const rows = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: "",
        }) as unknown as unknown[][];
        const { entries, errors } = parseTabularRowsToReportEntries(rows, shopId);
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
