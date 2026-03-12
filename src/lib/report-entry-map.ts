import type { ReportEntry } from "@/client/store/useReportsStore";

export type ReportEntryInputKey = keyof Omit<ReportEntry, "id" | "shopId" | "uploadedAt">;

/**
 * 매장별 엑셀/시트 가져오기 설정.
 * null/미설정이면 기본 매핑 및 기본 마진 계산(액면+구두 A~F) 사용.
 */
export interface ReportImportConfig {
  /** 엑셀 헤더명 → 내부 필드 키. 같은 헤더가 없으면 기본 매핑으로 보완 */
  columnMapping?: Record<string, string>;
  /** 'use_column': 마진 컬럼만 사용. 'sum_fields': 마진 없을 때 지정 필드 합산 */
  marginFormula?: "use_column" | "sum_fields";
  /** marginFormula가 'sum_fields'일 때 합산할 숫자 필드 키 목록 */
  marginSumFields?: string[];
}

/** 기본 매핑(한글/영문 휴대폰 판매일보). 매장 설정 없을 때 사용하며, 설정 UI에서 참조 가능 */
export const DEFAULT_HEADER_MAP: Record<string, ReportEntryInputKey> = {
  // ── 이름 ──
  이름: "name",
  고객명: "name",
  고객이름: "name",
  "고객 이름": "name",
  "고객 명": "name",
  성명: "name",
  구매자: "name",
  수령인: "name",
  주문자: "name",
  가입자: "name",
  "가입자명": "name",
  "가입자 명": "name",
  개통자: "name",
  "개통자명": "name",
  name: "name",
  customer: "name",

  // ── 연락처 ──
  연락처: "phone",
  전화: "phone",
  전화번호: "phone",
  휴대폰: "phone",
  휴대전화: "phone",
  연락처번호: "phone",
  핸드폰: "phone",
  휴대폰번호: "phone",
  "전화번호1": "phone",
  "연락처1": "phone",
  "고객연락처": "phone",
  "고객 연락처": "phone",
  "가입자연락처": "phone",
  "가입자 연락처": "phone",
  번호: "phone",
  phone: "phone",
  tel: "phone",
  mobile: "phone",

  // ── 생년월일 ──
  생년월일: "birthDate",
  생일: "birthDate",
  "생년 월일": "birthDate",
  주민번호: "birthDate",
  "주민등록번호": "birthDate",
  birthDate: "birthDate",
  birth: "birthDate",

  // ── 주소 ──
  주소: "address",
  "고객주소": "address",
  "고객 주소": "address",
  address: "address",

  // ── 유입경로 ──
  유입: "path",
  유입경로: "path",
  "유입 경로": "path",
  경로: "path",
  채널: "path",
  path: "path",
  channel: "path",

  // ── 통신사 ──
  통신사: "existingCarrier",
  기존통신사: "existingCarrier",
  "기존 통신사": "existingCarrier",
  이전통신사: "existingCarrier",
  "이전 통신사": "existingCarrier",
  전환통신사: "existingCarrier",
  가입통신사: "existingCarrier",
  "가입 통신사": "existingCarrier",
  이동통신사: "existingCarrier",
  carrier: "existingCarrier",
  existingCarrier: "existingCarrier",

  // ── 단말기 / 모델 ──
  개통단말기: "productName",
  "개통 단말기": "productName",
  개통단말: "productName",
  상품: "productName",
  상품명: "productName",
  기기: "productName",
  기기명: "productName",
  단말기: "productName",
  단말기명: "productName",
  "단말기 명": "productName",
  단말: "productName",
  모델: "productName",
  모델명: "productName",
  "모델 명": "productName",
  기종: "productName",
  기종명: "productName",
  "개통 모델": "productName",
  개통모델: "productName",
  "개통기기": "productName",
  "개통 기기": "productName",
  "판매 단말기": "productName",
  판매단말기: "productName",
  "판매 모델": "productName",
  판매모델: "productName",
  device: "productName",
  model: "productName",
  productName: "productName",
  product_name: "productName",

  // ── 판매일 ──
  판매일: "saleDate",
  일자: "saleDate",
  날짜: "saleDate",
  개통일: "saleDate",
  "개통 일자": "saleDate",
  개통일자: "saleDate",
  "판매 일자": "saleDate",
  판매일자: "saleDate",
  거래일: "saleDate",
  "거래 일자": "saleDate",
  date: "saleDate",
  saleDate: "saleDate",

  // ── 금액 ──
  금액: "amount",
  판매가: "amount",
  판매금액: "amount",
  "판매 금액": "amount",
  거래금액: "amount",
  "거래 금액": "amount",
  매출: "amount",
  매출액: "amount",
  amount: "amount",

  // ── 마진 ──
  마진: "margin",
  판매마진: "margin",
  "판매 마진": "margin",
  수익: "margin",
  이익: "margin",
  순이익: "margin",
  margin: "margin",

  // ── 추가 할인 ──
  "추가 할인": "additionalDiscountAmount",
  추가할인: "additionalDiscountAmount",
  additionalDiscountAmount: "additionalDiscountAmount",

  // ── 마진 계산 구성요소 ──
  출고가: "factoryPrice",
  "출고 가격": "factoryPrice",
  factoryPrice: "factoryPrice",
  공시지원: "officialSubsidy",
  공시: "officialSubsidy",
  "공시 지원금": "officialSubsidy",
  공시지원금: "officialSubsidy",
  officialSubsidy: "officialSubsidy",
  할부원금: "installmentPrincipal",
  "할부 원금": "installmentPrincipal",
  installmentPrincipal: "installmentPrincipal",
  할부개월수: "installmentMonths",
  "할부 개월수": "installmentMonths",
  "할부 개월": "installmentMonths",
  installmentMonths: "installmentMonths",
  액면: "faceAmount",
  액면가: "faceAmount",
  faceAmount: "faceAmount",
  "구두 A": "verbalA",
  구두A: "verbalA",
  verbalA: "verbalA",
  "구두 B": "verbalB",
  구두B: "verbalB",
  verbalB: "verbalB",
  "구두 C": "verbalC",
  구두C: "verbalC",
  verbalC: "verbalC",
  "구두 D": "verbalD",
  구두D: "verbalD",
  verbalD: "verbalD",
  "구두 E": "verbalE",
  구두E: "verbalE",
  verbalE: "verbalE",
  "구두 F": "verbalF",
  구두F: "verbalF",
  verbalF: "verbalF",

  // ── 판매사 / 담당자 ──
  판매사: "salesPerson",
  담당: "salesPerson",
  담당자: "salesPerson",
  담당판매사: "salesPerson",
  "담당 판매사": "salesPerson",
  판매원: "salesPerson",
  직원: "salesPerson",
  직원명: "salesPerson",
  "직원 이름": "salesPerson",
  영업사원: "salesPerson",
  salesPerson: "salesPerson",
  staff: "salesPerson",

  // ── 요금제 ──
  요금제: "planName",
  "요금제명": "planName",
  "요금제 명": "planName",
  "가입 요금제": "planName",
  가입요금제: "planName",
  "개통 요금제": "planName",
  개통요금제: "planName",
  plan: "planName",
  planName: "planName",

  // ── 지원금 ──
  지원금: "supportAmount",
  지원내용: "supportAmount",
  "지원 금액": "supportAmount",
  지원액: "supportAmount",
  보조금: "supportAmount",
  supportAmount: "supportAmount",

  // ── 검수 / 복지 / 보험 / 카드 / 결합 ──
  검수: "inspectionStore",
  "매장 검수": "inspectionStore",
  매장검수: "inspectionStore",
  inspectionStore: "inspectionStore",
  "사무실 검수": "inspectionOffice",
  사무실검수: "inspectionOffice",
  inspectionOffice: "inspectionOffice",
  복지: "welfare",
  welfare: "welfare",
  보험: "insurance",
  insurance: "insurance",
  카드: "card",
  card: "card",
  결합: "combined",
  combined: "combined",

  // ── 유무선 / 유형 ──
  유무선: "lineType",
  "유/무선": "lineType",
  lineType: "lineType",
  유형: "saleType",
  개통유형: "saleType",
  "개통 유형": "saleType",
  판매유형: "saleType",
  "판매 유형": "saleType",
  saleType: "saleType",

  // ── 일련번호 ──
  일련번호: "serialNumber",
  "일련 번호": "serialNumber",
  시리얼: "serialNumber",
  시리얼번호: "serialNumber",
  "시리얼 번호": "serialNumber",
  IMEI: "serialNumber",
  imei: "serialNumber",
  serialNumber: "serialNumber",
  serial: "serialNumber",

  // ── 개통시간 / 개통매장 ──
  개통시간: "activationTime",
  "개통 시간": "activationTime",
  activationTime: "activationTime",
  개통매장: "inspectionStore",
  "개통 매장": "inspectionStore",
};

/** 숫자로 파싱하는 필드 (마진 합산 후보 포함) */
const NUMERIC_KEYS = new Set<ReportEntryInputKey>([
  "amount", "margin", "supportAmount", "factoryPrice", "officialSubsidy",
  "installmentPrincipal", "installmentMonths", "faceAmount",
  "verbalA", "verbalB", "verbalC", "verbalD", "verbalE", "verbalF",
  "additionalDiscountAmount",
]);

function isNumericKey(key: string): key is ReportEntryInputKey {
  return NUMERIC_KEYS.has(key as ReportEntryInputKey);
}

/** 헤더 문자열 정규화: BOM·제로폭문자 제거, trim, 연속 공백 하나로 */
function normalizeHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * 정확한 매핑이 없을 때, 헤더 문구로 name/phone 추측 (오매핑 위험을 줄이기 위해 name/phone만).
 * 담당자명 등은 salesPerson이므로 name으로 추측하지 않음.
 */
function guessNameOrPhoneColumn(normalizedHeader: string): ReportEntryInputKey | "" {
  const n = normalizedHeader;
  if (!n) return "";
  // name 후보: 고객이름·성명·구매자·수령인·주문자, 또는 '고객'+'이름/명' 조합(단, 담당 제외)
  if (
    /고객이름|^성명$|구매자|수령인|주문자/.test(n) ||
    (n.includes("고객") && (n.includes("이름") || n.endsWith("명")) && !n.includes("담당"))
  )
    return "name";
  // phone 후보: 전화·연락·휴대·핸드폰·폰 포함
  if (/전화|연락|휴대|핸드폰|폰/.test(n)) return "phone";
  return "";
}

/**
 * 한글/숫자 날짜 문자열을 YYYY-MM-DD로 정규화.
 * "1월 2일", "2026년 1월 2일", "26.1.2", "2026-01-02" 등 지원.
 * 파싱 실패 시 빈 문자열 반환(DB date 컬럼에 넣지 않기 위함).
 */
function normalizeDate(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && value > 35000 && value < 55000) {
    const d = new Date((Math.floor(value) - 25569) * 86400000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const serial = parseFloat(s);
  if (!Number.isNaN(serial) && serial > 35000 && serial < 55000 && /^\d{4,5}(\.\d+)?$/.test(s)) {
    const d = new Date((Math.floor(serial) - 25569) * 86400000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const num = Date.parse(s);
  if (!Number.isNaN(num)) return new Date(num).toISOString().slice(0, 10);
  const now = new Date();
  const year = now.getFullYear();
  const matchKo = s.match(/(\d{2,4})년\s*(\d{1,2})월\s*(\d{1,2})일?/);
  if (matchKo) {
    const y = matchKo[1].length === 2 ? 2000 + parseInt(matchKo[1], 10) : parseInt(matchKo[1], 10);
    const m = parseInt(matchKo[2], 10);
    const d = parseInt(matchKo[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  const matchShort = s.match(/(\d{1,2})월\s*(\d{1,2})일?/);
  if (matchShort) {
    const m = parseInt(matchShort[1], 10);
    const d = parseInt(matchShort[2], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  const matchDot = s.match(/^(\d{2,4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (matchDot) {
    let y = parseInt(matchDot[1], 10);
    if (y < 100) y += 2000;
    const m = parseInt(matchDot[2], 10);
    const d = parseInt(matchDot[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return "";
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
  /** 매핑 실패 시 클라이언트/로그용: 파일에서 읽은 첫 행(헤더) */
  detectedHeaders?: string[];
  /** 디버그: 헤더→필드 매핑 결과 */
  headerMapping?: { header: string; mappedTo: string }[];
}

export interface ParseReportOptions {
  config?: ReportImportConfig | null;
}

/** 판매일보 표에서 찾을 컬럼명(고객정보·상품·요금제·마진 4개 파트 기준) */
const TARGET_COLUMN_LABELS = [
  "판매사",
  "담당자",
  "고객명",
  "연락처",
  "전화번호",
  "개통단말기",
  "모델",
  "통신사",
  "요금제",
  "판매일",
  "날짜",
  "금액",
  "마진",
  "판매마진",
  "최종 마진",
  "최종마진",
  "지원금",
  "출고가",
  "공시지원",
  "액면",
  "일련번호",
];

/** 시트 전체를 스캔해 '판매일보' 또는 고객정보/상품/요금제/마진 4파트 표의 헤더 행을 찾고, 헤더+데이터 행 배열을 반환 */
export function findReportTableInSheet(rows: unknown[][]): unknown[][] | null {
  if (!Array.isArray(rows) || rows.length < 2) return null;

  const maxScan = Math.min(80, rows.length - 2);
  let bestScore = 0;
  let bestHeader: unknown[] = [];
  let bestDataStart = -1;

  for (let start = 0; start <= maxScan; start++) {
    const row0 = (rows[start] as unknown[]) ?? [];
    const row1 = (rows[start + 1] as unknown[]) ?? [];

    const len = Math.max(row0.length, row1.length);

    const combined = Array.from({ length: len }, (_, j) => {
      const a = String(row1[j] ?? "").trim();
      const b = String(row0[j] ?? "").trim();
      return a || b;
    });

    const single = row0.map((c) => String(c ?? "").trim());

    for (const headers of [combined, single]) {
      let score = 0;
      for (const label of TARGET_COLUMN_LABELS) {
        const normLabel = normalizeHeader(label);
        const found = headers.some((h) => {
          const n = normalizeHeader(h);
          return n === normLabel || n === label || (n.length > 0 && (n.includes(normLabel) || normLabel.includes(n)));
        });
        if (found) score += 1;
      }
      const hasSection = headers.some((h) => /고객정보|상품|요금제|마진/.test(normalizeHeader(h)));
      if (hasSection) score += 2;
      const dataStart = headers === combined ? start + 2 : start + 1;
      if (score > bestScore && score >= 3 && dataStart < rows.length) {
        bestScore = score;
        bestHeader = headers;
        bestDataStart = dataStart;
      }
    }
  }

  if (bestDataStart < 0 || bestHeader.length === 0) return null;

  const dataRows = rows.slice(bestDataStart) as unknown[][];
  if (dataRows.length === 0) return null;

  return [bestHeader, ...dataRows];
}

/**
 * 테이블 행(엑셀/CSV 첫 행=헤더)을 판매일보 항목으로 변환.
 * config가 있으면 매장별 컬럼 매핑·마진 계산 방식을 적용하고, 없으면 기본 매핑 사용.
 */
export function parseTabularRowsToReportEntries(
  rows: unknown[][],
  shopId: string,
  options?: ParseReportOptions
): ParseReportResult {
  if (!Array.isArray(rows) || rows.length < 2) {
    return { entries: [], errors: ["헤더와 최소 1행의 데이터가 필요합니다."] };
  }

  const config = options?.config;
  const customMap = config?.columnMapping && Object.keys(config.columnMapping).length > 0
    ? config.columnMapping
    : null;
  const effectiveHeaderMap: Record<string, ReportEntryInputKey> = { ...DEFAULT_HEADER_MAP };
  const validKeys = new Set<ReportEntryInputKey>(Object.values(DEFAULT_HEADER_MAP));
  if (customMap) {
    for (const [header, key] of Object.entries(customMap)) {
      const k = key.trim() as ReportEntryInputKey;
      if (k && validKeys.has(k)) {
        (effectiveHeaderMap as Record<string, ReportEntryInputKey>)[header.trim()] = k;
      }
    }
  }

  const headers = (rows[0] as unknown[]).map((h) => String(h ?? "").trim());
  const colToKey: ReportEntryInputKey[] = headers.map((h) => {
    const norm = normalizeHeader(h);
    const noSpace = norm.replace(/\s/g, "");
    const exact = effectiveHeaderMap[h] ?? effectiveHeaderMap[norm] ?? effectiveHeaderMap[noSpace];
    if (exact) return exact;
    const guessed = guessNameOrPhoneColumn(norm);
    return guessed || ("" as ReportEntryInputKey);
  });

  // 퍼지 폴백: 정확한 매핑이 안 된 필드를 키워드 기반으로 보완
  const FUZZY_FALLBACKS: { key: ReportEntryInputKey; pattern: RegExp }[] = [
    { key: "productName", pattern: /개통|단말|모델|기종|기기|product|device|handset/ },
    { key: "existingCarrier", pattern: /통신사|carrier|telecom/ },
    { key: "planName", pattern: /요금제|plan|rate|tariff/ },
    { key: "saleDate", pattern: /판매일|개통일|sale.*date/ },
    { key: "salesPerson", pattern: /판매사|담당|sales.*person|staff/ },
    { key: "margin", pattern: /판매마진|판매.*마진|sale.*margin/ },
  ];
  const mappedKeys = new Set(colToKey.filter(Boolean));
  for (const { key, pattern } of FUZZY_FALLBACKS) {
    if (mappedKeys.has(key)) continue;
    for (let i = 0; i < colToKey.length; i++) {
      if (colToKey[i]) continue;
      const h = (headers[i] ?? "").toLowerCase().replace(/\s/g, "");
      if (pattern.test(h)) {
        colToKey[i] = key;
        mappedKeys.add(key);
        break;
      }
    }
  }

  const headerMapping = headers.map((h, i) => ({
    header: h,
    mappedTo: colToKey[i] || "(unmapped)",
  }));

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
      factoryPrice: 0,
      officialSubsidy: 0,
      installmentPrincipal: 0,
      installmentMonths: 0,
      faceAmount: 0,
      verbalA: 0,
      verbalB: 0,
      verbalC: 0,
      verbalD: 0,
      verbalE: 0,
      verbalF: 0,
      inspectionStore: "",
      inspectionOffice: "",
      welfare: "",
      insurance: "",
      card: "",
      combined: "",
      lineType: "",
      saleType: "",
      serialNumber: "",
      activationTime: "",
      additionalDiscountAmount: 0,
    };

    colToKey.forEach((key, colIdx) => {
      if (!key) return;
      const raw = row[colIdx];
      if (key === "saleDate") record[key] = normalizeDate(raw);
      else if (NUMERIC_KEYS.has(key)) record[key] = normalizeNumber(raw);
      else record[key] = raw != null ? String(raw).trim() : "";
    });

    const name = record.name as string;
    const phone = record.phone as string;
    if (!name && !phone) continue;

    // 마진: 엑셀에 '판매마진' 등 마진 컬럼 값이 있으면 그걸 사용. 없을 때만 합산/기본 적용
    const originalMargin = (record.margin as number) ?? 0;
    const hasRealMargin = originalMargin !== 0 && !Number.isNaN(originalMargin);
    if (!hasRealMargin) {
      if (config?.marginFormula === "sum_fields" && Array.isArray(config.marginSumFields) && config.marginSumFields.length > 0) {
        let sum = 0;
        for (const field of config.marginSumFields) {
          if (isNumericKey(field)) sum += (record[field] as number) ?? 0;
        }
        record.margin = sum;
      } else {
        const faceAmount = (record.faceAmount as number) ?? 0;
        const verbalA = (record.verbalA as number) ?? 0;
        const verbalB = (record.verbalB as number) ?? 0;
        const verbalC = (record.verbalC as number) ?? 0;
        const verbalD = (record.verbalD as number) ?? 0;
        const verbalE = (record.verbalE as number) ?? 0;
        const verbalF = (record.verbalF as number) ?? 0;
        const computedBlack = faceAmount + verbalA + verbalB + verbalC + verbalD + verbalE + verbalF;
        if (computedBlack !== 0) record.margin = computedBlack;
      }
    }

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
      factoryPrice: (record.factoryPrice as number) || undefined,
      officialSubsidy: (record.officialSubsidy as number) || undefined,
      installmentPrincipal: (record.installmentPrincipal as number) || undefined,
      installmentMonths: (record.installmentMonths as number) || undefined,
      faceAmount: (record.faceAmount as number) || undefined,
      verbalA: (record.verbalA as number) || undefined,
      verbalB: (record.verbalB as number) || undefined,
      verbalC: (record.verbalC as number) || undefined,
      verbalD: (record.verbalD as number) || undefined,
      verbalE: (record.verbalE as number) || undefined,
      verbalF: (record.verbalF as number) || undefined,
      inspectionStore: (record.inspectionStore as string) || undefined,
      inspectionOffice: (record.inspectionOffice as string) || undefined,
      welfare: (record.welfare as string) || undefined,
      insurance: (record.insurance as string) || undefined,
      card: (record.card as string) || undefined,
      combined: (record.combined as string) || undefined,
      lineType: (record.lineType as string) || undefined,
      saleType: (record.saleType as string) || undefined,
      serialNumber: (record.serialNumber as string) || undefined,
      activationTime: (record.activationTime as string) || undefined,
      additionalDiscountAmount: (record.additionalDiscountAmount as number) || undefined,
    });
  }

  if (entries.length === 0 && rows.length > 1) {
    const mapped = colToKey.map((k, i) => k ? `${headers[i]}→${k}` : null).filter(Boolean);
    const sampleLines = rows.slice(0, 10).map((r, i) => {
      const cells = (r as unknown[]).slice(0, 15).map((c) => String(c ?? "").trim()).filter(Boolean);
      return cells.length > 0 ? `[${i}] ${cells.slice(0, 6).join(",")}` : null;
    }).filter(Boolean);
    const debugInfo = [
      `총${rows.length}행`,
      mapped.length > 0 ? `매핑:${mapped.join(";")}` : "매핑없음",
      sampleLines.length > 0 ? sampleLines.join(" ") : "데이터없음",
    ].join(" | ");
    errors.push(`매핑된 고객 데이터가 없습니다. (${debugInfo})`);
    return { entries, errors, detectedHeaders: headers, headerMapping };
  }

  return { entries, errors, headerMapping };
}

