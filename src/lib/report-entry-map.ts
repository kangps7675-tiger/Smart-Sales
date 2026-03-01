import type { ReportEntry } from "@/client/store/useReportsStore";

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
  existingCarrier: "existingCarrier",
  개통단말기: "productName",
  상품: "productName",
  상품명: "productName",
  기기: "productName",
  productName: "productName",
  판매일: "saleDate",
  일자: "saleDate",
  날짜: "saleDate",
  saleDate: "saleDate",
  금액: "amount",
  판매가: "amount",
  amount: "amount",
  마진: "margin",
  margin: "margin",
  블랙: "margin",
  // 마진 계산 구성요소
  출고가: "factoryPrice",
  factoryPrice: "factoryPrice",
  공시지원: "officialSubsidy",
  공시: "officialSubsidy",
  officialSubsidy: "officialSubsidy",
  할부원금: "installmentPrincipal",
  "할부 원금": "installmentPrincipal",
  installmentPrincipal: "installmentPrincipal",
  할부개월수: "installmentMonths",
  "할부 개월수": "installmentMonths",
  installmentMonths: "installmentMonths",
  액면: "faceAmount",
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
  판매사: "salesPerson",
  담당: "salesPerson",
  salesPerson: "salesPerson",
  요금제: "planName",
  planName: "planName",
  지원금: "supportAmount",
  supportAmount: "supportAmount",
  // 세부: 검수, 복지/보험/카드/결합, 유무선·유형·일련번호
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
  유무선: "lineType",
  lineType: "lineType",
  유형: "saleType",
  saleType: "saleType",
  일련번호: "serialNumber",
  serialNumber: "serialNumber",
  개통시간: "activationTime",
  "개통 시간": "activationTime",
  activationTime: "activationTime",
  개통매장: "inspectionStore",
  "개통 매장": "inspectionStore",
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

export function parseTabularRowsToReportEntries(
  rows: unknown[][],
  shopId: string
): ParseReportResult {
  if (!Array.isArray(rows) || rows.length < 2) {
    return { entries: [], errors: ["헤더와 최소 1행의 데이터가 필요합니다."] };
  }

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
    };

    colToKey.forEach((key, colIdx) => {
      if (!key) return;
      const raw = row[colIdx];
      if (key === "saleDate") record[key] = normalizeDate(raw);
      else if (
        key === "amount" ||
        key === "margin" ||
        key === "supportAmount" ||
        key === "factoryPrice" ||
        key === "officialSubsidy" ||
        key === "installmentPrincipal" ||
        key === "installmentMonths" ||
        key === "faceAmount" ||
        key === "verbalA" ||
        key === "verbalB" ||
        key === "verbalC" ||
        key === "verbalD" ||
        key === "verbalE" ||
        key === "verbalF"
      ) {
        record[key] = normalizeNumber(raw);
      } else {
        record[key] = raw != null ? String(raw).trim() : "";
      }
    });

    const name = record.name as string;
    const phone = record.phone as string;
    if (!name && !phone) continue;

    // 블랙(최종 마진) 계산:
    // - 기본 원칙: 엑셀/시트에서 넘어온 margin 값이 있으면 그대로 사용
    // - margin이 0이거나 비어 있고, 액면/구두 A~F 중 하나라도 값이 있으면
    //   faceAmount + verbalA..F 합으로 margin을 계산
    const faceAmount = (record.faceAmount as number) ?? 0;
    const verbalA = (record.verbalA as number) ?? 0;
    const verbalB = (record.verbalB as number) ?? 0;
    const verbalC = (record.verbalC as number) ?? 0;
    const verbalD = (record.verbalD as number) ?? 0;
    const verbalE = (record.verbalE as number) ?? 0;
    const verbalF = (record.verbalF as number) ?? 0;

    const computedBlack =
      faceAmount + verbalA + verbalB + verbalC + verbalD + verbalE + verbalF;

    const originalMargin = (record.margin as number) ?? 0;
    if ((originalMargin === 0 || Number.isNaN(originalMargin)) && computedBlack !== 0) {
      record.margin = computedBlack;
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
    });
  }

  if (entries.length === 0 && rows.length > 1) {
    errors.push("매핑된 고객 데이터가 없습니다. 첫 행 헤더를 확인해 주세요.");
  }

  return { entries, errors };
}

