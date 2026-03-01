/**
 * CRM 페이지 공통 타입 (page / view 분리로 파서 오류 방지)
 */

export const INFLOW_OPTIONS = ["로드", "컨택", "전화", "온라인", "지인"] as const;
export type InflowType = (typeof INFLOW_OPTIONS)[number];

export type Consultation = {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  product_name: string | null;
  memo: string | null;
  consultation_date: string;
  sales_person: string | null;
  activation_status: "O" | "△" | "X";
  report_id: string | null;
  inflow_type: string | null;
  created_at: string;
};

export type StatsRow = { label: string; days: number[]; total: number; percent: number };
export type StatsPayload = {
  inflow: { rows: StatsRow[]; totalRow: { days: number[]; total: number } };
  activation: { rows: StatsRow[]; totalRow: { days: number[]; total: number } };
  daysInMonth: number;
};

export type ReportEntry = { sale_date?: string; saleDate?: string };

export type CrmSummarySheet = {
  goal: number;
  actual: number;
  remain: number;
  daysInMonth: number;
  elapsedDays: number;
  avgGoalPerDay: number;
  avgActualPerDay: number;
  dailyCounts: number[];
};

export type CrmFormState = {
  name: string;
  phone: string;
  product_name: string;
  memo: string;
  consultation_date: string;
  sales_person: string;
  activation_status: "O" | "△" | "X";
  inflow_type: string;
};
