/**
 * 견적 요약 고정 바 컴포넌트
 * 
 * 역할:
 * - 계약 생성 과정에서 하단에 고정되어 표시되는 견적 요약
 * - 실시간으로 변경되는 가격 정보 표시
 * - 월 납부금, 기기 할부금, 요금제 요금, 부가서비스 요금 합계 표시
 * 
 * 특징:
 * - 화면 하단에 고정되어 항상 보임
 * - 계약 정보 변경 시 실시간 업데이트
 * 
 * @file QuoteSummaryFixedBar.tsx
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useContractStore } from "@/client/store/useContractStore";
import { usePolicyStore } from "@/client/store/usePolicyStore";

/**
 * 기본 할부 개월 수
 */
const DEFAULT_INSTALLMENTS = 24;

/**
 * 견적 요약 고정 바 컴포넌트
 * 
 * 계약 생성 과정에서 하단에 고정되어 표시되며,
 * 선택한 기기, 요금제, 부가서비스에 따른 월 납부금을 실시간으로 계산하여 표시합니다.
 */
export function QuoteSummaryFixedBar() {
  const plan = useContractStore((s) => s.plan);
  const discount = useContractStore((s) => s.discount);
  const settlement = useContractStore((s) => s.settlement);
  
  // 정책 스토어에서 최신 정책 데이터 가져오기
  const getPlanPolicyByName = usePolicyStore((s) => s.getPlanPolicyByName);
  const getAddOnPolicyById = usePolicyStore((s) => s.getAddOnPolicyById);

  // 선택한 요금제의 월 요금 조회 (정책 스토어에서)
  const selectedPlanPolicy = getPlanPolicyByName(plan.planName);
  const monthlyFee = selectedPlanPolicy?.monthlyFee ?? 0;
  
  const installments = plan.installments > 0 ? plan.installments : DEFAULT_INSTALLMENTS;
  const installmentPrincipal = settlement.finalPrice;
  const monthlyDevice = installments > 0 ? Math.round(settlement.finalPrice / installments) : 0;
  
  // 선택한 부가서비스들의 월 납부금 계산 (정책 스토어에서)
  const addOnMonthly = discount.addOnServices.reduce((sum, id) => {
    const addonPolicy = getAddOnPolicyById(id);
    const price = addonPolicy?.price ?? 0;
    return sum + (price > 0 ? Math.round(price / 12) : 0);
  }, 0);
  
  const monthlyTotal = monthlyDevice + monthlyFee + addOnMonthly;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 p-4 pt-0"
      role="region"
      aria-label="견적 요약"
    >
      <Card className="mx-auto max-w-3xl border-primary/20 shadow-lg">
        <CardContent className="flex items-stretch justify-between gap-6 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium text-muted-foreground">할부 원금</span>
          <p className="mt-1 truncate text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
            {installmentPrincipal > 0 ? `${installmentPrincipal.toLocaleString()}원` : "—"}
          </p>
          {installmentPrincipal > 0 && installments > 0 && (
            <span className="mt-1 text-xs text-muted-foreground">
              {installments}개월 기준 월 {monthlyDevice.toLocaleString()}원
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col border-l-2 border-border pl-5">
          <span className="text-sm font-medium text-muted-foreground">월 예상 납부금</span>
          <p className="mt-1 truncate text-3xl font-bold tabular-nums tracking-tight text-primary sm:text-4xl">
            {monthlyTotal > 0 ? `${monthlyTotal.toLocaleString()}원` : "—"}
          </p>
          {monthlyTotal > 0 && (
            <span className="mt-1 text-xs text-muted-foreground">
              기기 {monthlyDevice.toLocaleString()} + 요금제 {monthlyFee.toLocaleString()}
              {addOnMonthly > 0 ? ` + 부가 ${addOnMonthly.toLocaleString()}` : ""}
            </span>
          )}
        </div>
        </CardContent>
      </Card>
      <div className="h-safe-bottom min-h-[env(safe-area-inset-bottom,0)]" />
    </div>
  );
}
