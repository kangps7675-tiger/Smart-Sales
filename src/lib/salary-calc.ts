/**
 * 판매일보 기반 급여 계산 로직
 *
 * 판매일보(ReportEntry)에 기록된 판매사·마진·지원금을 집계하고,
 * 건당 인센티브·마진 비율 등으로 급여를 계산합니다.
 * 매장주(tenant_admin) 로그인 시 판매일보 페이지에서만 노출됩니다.
 *
 * @file salary-calc.ts
 */

import type { ReportEntry } from "@/client/store/useReportsStore";

/** 판매사별 집계 (건수, 마진 합계, 지원금 합계) */
export interface SalesPersonSummary {
  salesPerson: string;
  count: number;
  totalMargin: number;
  totalSupport: number;
}

/** 급여 계산 옵션 (필요 시 매장 설정으로 확장 가능) */
export interface SalaryCalcOptions {
  /** 건당 인센티브 (원). 기본 30,000 */
  perSaleIncentive?: number;
  /** 마진의 N%를 급여에 포함. 0~1 (예: 0.1 = 10%). 기본 0 */
  marginPercent?: number;
}

const DEFAULT_PER_SALE = 30_000;
const DEFAULT_MARGIN_PERCENT = 0;

/**
 * 판매일보 목록을 판매사별로 집계합니다.
 */
export function getSalesPersonSummaries(entries: ReportEntry[]): SalesPersonSummary[] {
  const map = new Map<string, { count: number; totalMargin: number; totalSupport: number }>();

  for (const e of entries) {
    const key = (e.salesPerson ?? "").trim() || "(미지정)";
    const cur = map.get(key) ?? { count: 0, totalMargin: 0, totalSupport: 0 };
    map.set(key, {
      count: cur.count + 1,
      totalMargin: cur.totalMargin + (e.margin ?? 0),
      totalSupport: cur.totalSupport + (e.supportAmount ?? 0),
    });
  }

  return Array.from(map.entries())
    .map(([salesPerson, v]) => ({
      salesPerson,
      count: v.count,
      totalMargin: v.totalMargin,
      totalSupport: v.totalSupport,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 집계 한 건에 대해 급여를 계산합니다.
 * 공식: (건당 인센티브 × 건수) + (마진 합계 × 마진 비율)
 */
export function calcSalaryFromSummary(
  summary: SalesPersonSummary,
  options?: SalaryCalcOptions
): number {
  const perSale = options?.perSaleIncentive ?? DEFAULT_PER_SALE;
  const marginPct = options?.marginPercent ?? DEFAULT_MARGIN_PERCENT;
  const byCount = summary.count * perSale;
  const byMargin = Math.round(summary.totalMargin * marginPct);
  return byCount + byMargin;
}

/**
 * 판매사별 집계 + 계산 급여를 한 번에 반환합니다.
 */
export function getSalesPersonSalaryRows(
  entries: ReportEntry[],
  options?: SalaryCalcOptions
): (SalesPersonSummary & { calculatedSalary: number })[] {
  const summaries = getSalesPersonSummaries(entries);
  return summaries.map((s) => ({
    ...s,
    calculatedSalary: calcSalaryFromSummary(s, options),
  }));
}
