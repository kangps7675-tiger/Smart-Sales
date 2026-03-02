/**
 * Claude API 감지 필드명 ↔ 내부 ReportEntry 필드 매핑
 * 매핑 확인 UI 드롭다운 옵션 및 파싱 시 변환에 사용
 */

import type { ReportEntryInputKey } from "@/lib/report-entry-map";

/** Claude API / UI에서 사용하는 필드명 (영문) */
export const CLAUDE_FIELD_OPTIONS: { value: string | null; label: string }[] = [
  { value: "date", label: "날짜" },
  { value: "customer_name", label: "고객명" },
  { value: "phone", label: "전화번호" },
  { value: "birth_date", label: "생년월일" },
  { value: "staff_name", label: "담당 판매사" },
  { value: "carrier", label: "통신사" },
  { value: "model", label: "단말기 모델" },
  { value: "rate_plan", label: "요금제" },
  { value: "sale_type", label: "개통 유형" },
  { value: "wireless_type", label: "유무선 구분" },
  { value: "serial_number", label: "일련번호" },
  { value: "support_amount", label: "공시지원금" },
  { value: "sale_price", label: "출고가" },
  { value: "installment_principal", label: "할부원금" },
  { value: "installment_months", label: "할부 개월수" },
  { value: "face_commission", label: "액면 수수료" },
  { value: "verbal_a", label: "구두 A" },
  { value: "verbal_b", label: "구두 B" },
  { value: "verbal_c", label: "구두 C" },
  { value: "verbal_d", label: "구두 D" },
  { value: "verbal_e", label: "구두 E" },
  { value: "verbal_f", label: "구두 F" },
  { value: "margin_black", label: "블랙(마진)" },
  { value: "welfare", label: "복지" },
  { value: "insurance", label: "보험" },
  { value: "card", label: "카드" },
  { value: "combination", label: "결합" },
  { value: "address", label: "주소" },
  { value: "memo", label: "메모/비고" },
  { value: null, label: "무시" },
];

/** Claude 필드명 → 내부 ReportEntry 키 */
export const CLAUDE_TO_INTERNAL: Record<string, ReportEntryInputKey> = {
  date: "saleDate",
  customer_name: "name",
  phone: "phone",
  birth_date: "birthDate",
  staff_name: "salesPerson",
  carrier: "existingCarrier",
  model: "productName",
  rate_plan: "planName",
  sale_type: "saleType",
  wireless_type: "lineType",
  serial_number: "serialNumber",
  support_amount: "supportAmount",
  sale_price: "factoryPrice",
  installment_principal: "installmentPrincipal",
  installment_months: "installmentMonths",
  face_commission: "faceAmount",
  verbal_a: "verbalA",
  verbal_b: "verbalB",
  verbal_c: "verbalC",
  verbal_d: "verbalD",
  verbal_e: "verbalE",
  verbal_f: "verbalF",
  margin_black: "margin",
  welfare: "welfare",
  insurance: "insurance",
  card: "card",
  combination: "combined",
  address: "address",
  memo: "path",
};

export function claudeFieldToInternal(claudeField: string | null): ReportEntryInputKey | "" {
  if (claudeField == null || claudeField === "") return "";
  return CLAUDE_TO_INTERNAL[claudeField] ?? "";
}
