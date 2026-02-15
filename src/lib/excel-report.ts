import * as XLSX from "xlsx";
import type { ReportEntry } from "@/client/store/useReportsStore";

/** 엑셀 첫 행 헤더 → 내부 필드 매핑 (다양한 한글/영문 컬럼명 지원) */
const HEADER_MAP: Record<string, keyof Omit<ReportEntry, "id" | "shopId" | "uploadedAt">> = {
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
};

function normalizeDate(value: unknown): string {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const num = Date.parse(s);
  if (!Number.isNaN(num)) return new Date(num).toISOString().slice(0, 10);
  return s;
}

function normalizeNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const s = String(value).replace(/,/g, "").trim();
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

export interface ParseReportResult {
  entries: Omit<ReportEntry, "id" | "uploadedAt">[];
  errors: string[];
}

/**
 * 엑셀 파일에서 판매일보 행 추출.
 * 첫 시트의 첫 행을 헤더로 사용하고, 매핑된 컬럼으로 ReportEntry 배열 생성.
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
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          header: 1,
          defval: "",
        }) as unknown[][];
        if (rows.length < 2) {
          resolve({ entries: [], errors: ["헤더와 최소 1행의 데이터가 필요합니다."] });
          return;
        }
        const headers = (rows[0] as unknown[]).map((h) => String(h ?? "").trim());
        const colToKey: (keyof Omit<ReportEntry, "id" | "shopId" | "uploadedAt">)[] = headers.map(
          (h) => HEADER_MAP[h] ?? ("" as keyof ReportEntry)
        );
        const entries: Omit<ReportEntry, "id" | "uploadedAt">[] = [];
        const errors: string[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown[];
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
          };
          colToKey.forEach((key, colIdx) => {
            if (!key) return;
            const raw = row[colIdx];
            if (key === "saleDate") record[key] = normalizeDate(raw);
            else if (key === "amount" || key === "margin") record[key] = normalizeNumber(raw);
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
          });
        }
        if (entries.length === 0 && rows.length > 1)
          errors.push("매핑된 고객(이름/연락처) 데이터가 없습니다. 첫 행 헤더를 확인해 주세요.");
        resolve({ entries, errors });
      } catch (err) {
        resolve({
          entries: [],
          errors: [err instanceof Error ? err.message : "엑셀 파싱 중 오류가 발생했습니다."],
        });
      }
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsBinaryString(file);
  });
}
