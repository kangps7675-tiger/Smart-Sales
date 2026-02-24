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

/**
 * 엑셀 첫 행 헤더 → 내부 필드 매핑
 * 
 * 다양한 한글/영문 컬럼명을 지원하여 사용자가 자유롭게 엑셀을 작성할 수 있도록 합니다.
 * 예: "이름", "고객명", "name" 모두 "name" 필드로 매핑됩니다.
 */
type ReportEntryInputKey = keyof Omit<ReportEntry, "id" | "shopId" | "uploadedAt">;

const HEADER_MAP: Record<string, ReportEntryInputKey> = {
  이름: "name",
  고객명: "name",
  name: "name",
  연락처: "phone",
  전화: "phone",
  휴대폰: "phone",
  phone: "phone",
  생년월일: "birthDate",
  생일: "birthDate",
  birthDate: "birthDate",
  주소: "address",
  address: "address",
  유입: "path",
  유입경로: "path",
  path: "path",
  통신사: "existingCarrier",
  기존통신사: "existingCarrier",
  개통단말기: "productName",
  existingCarrier: "existingCarrier",
  판매일: "saleDate",
  일자: "saleDate",
  날짜: "saleDate",
  saleDate: "saleDate",
  상품: "productName",
  상품명: "productName",
  기기: "productName",
  productName: "productName",
  금액: "amount",
  판매가: "amount",
  amount: "amount",
  마진: "margin",
  margin: "margin",
  판매사: "salesPerson",
  담당: "salesPerson",
  salesPerson: "salesPerson",
  요금제: "planName",
  planName: "planName",
  지원금: "supportAmount",
  supportAmount: "supportAmount",
};

/**
 * 날짜 값 정규화
 * 
 * 엑셀에서 읽은 날짜 값을 YYYY-MM-DD 형식으로 변환합니다.
 * 
 * @param value - 엑셀에서 읽은 날짜 값 (문자열, 숫자, Date 객체 등)
 * @returns YYYY-MM-DD 형식의 날짜 문자열 또는 빈 문자열
 */
function normalizeDate(value: unknown): string {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  // 이미 YYYY-MM-DD 형식이면 그대로 반환
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Date.parse로 파싱 가능한 형식이면 변환
  const num = Date.parse(s);
  if (!Number.isNaN(num)) return new Date(num).toISOString().slice(0, 10);
  // 변환 불가능하면 원본 반환
  return s;
}

/**
 * 숫자 값 정규화
 * 
 * 엑셀에서 읽은 숫자 값을 JavaScript number로 변환합니다.
 * 쉼표(,)가 포함된 문자열도 처리합니다.
 * 
 * @param value - 엑셀에서 읽은 숫자 값
 * @returns 숫자 값 (변환 불가능하면 0)
 */
function normalizeNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  // 이미 숫자 타입이면 그대로 반환
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  // 문자열에서 쉼표 제거 후 파싱
  const s = String(value).replace(/,/g, "").trim();
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * 엑셀 파싱 결과 인터페이스
 */
export interface ParseReportResult {
  entries: Omit<ReportEntry, "id" | "uploadedAt">[]; // 파싱된 판매일보 항목 배열
  errors: string[];                                   // 파싱 중 발생한 에러 메시지 배열
}

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
        // 최소 헤더 + 1행 데이터 필요
        if (rows.length < 2) {
          resolve({ entries: [], errors: ["헤더와 최소 1행의 데이터가 필요합니다."] });
          return;
        }
        // 첫 행을 헤더로 사용하여 컬럼 매핑
        const headers = (rows[0] as unknown[]).map((h) => String(h ?? "").trim());
        const colToKey: ReportEntryInputKey[] = headers.map(
          (h) => HEADER_MAP[h] ?? ("" as ReportEntryInputKey)
        );
        const entries: Omit<ReportEntry, "id" | "uploadedAt">[] = [];
        const errors: string[] = [];
        for (const row of rows.slice(1) as unknown[][]) {
          const record: Record<string, string | number> = {
            name: "",
            phone: "",
            birthDate: "",
            address: "",
            path: "",
            existingCarrier: "",
            saleDate: "",
            productName: "",
            amount: 0,
            margin: 0,
            salesPerson: "",
            planName: "",
            supportAmount: 0,
          };
          colToKey.forEach((key, colIdx) => {
            if (!key) return;
            const raw = row[colIdx];
            if (key === "saleDate") record[key] = normalizeDate(raw);
            else if (key === "amount" || key === "margin" || key === "supportAmount") record[key] = normalizeNumber(raw);
            else record[key] = raw != null ? String(raw).trim() : "";
          });
          const name = record.name as string;
          const phone = record.phone as string;
          if (!name && !phone) continue;
          entries.push({
            shopId,
            name: name ?? "",
            phone: phone ?? "",
            birthDate: (record.birthDate as string) ?? "",
            address: (record.address as string) ?? "",
            path: (record.path as string) ?? "",
            existingCarrier: (record.existingCarrier as string) ?? "",
            saleDate: (record.saleDate as string) || new Date().toISOString().slice(0, 10),
            productName: (record.productName as string) ?? "",
            amount: (record.amount as number) ?? 0,
            margin: (record.margin as number) ?? 0,
            salesPerson: (record.salesPerson as string) || undefined,
            planName: (record.planName as string) || undefined,
            supportAmount: (record.supportAmount as number) || undefined,
          });
        }
        // 데이터가 없으면 에러 메시지 추가
        if (entries.length === 0 && rows.length > 1)
          errors.push("매핑된 고객 데이터가 없습니다. 첫 행 헤더를 확인해 주세요.");
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
