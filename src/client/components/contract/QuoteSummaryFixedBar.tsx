"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useContractStore, MOCK_PLANS, MOCK_ADDONS } from "@/client/store/useContractStore";

const DEFAULT_INSTALLMENTS = 24;

export function QuoteSummaryFixedBar() {
  const device = useContractStore((s) => s.device);
  const plan = useContractStore((s) => s.plan);
  const discount = useContractStore((s) => s.discount);
  const settlement = useContractStore((s) => s.settlement);

  const selectedPlan = MOCK_PLANS.find((p) => p.name === plan.planName);
  const monthlyFee = selectedPlan?.monthlyFee ?? 0;
  const installments = plan.installments > 0 ? plan.installments : DEFAULT_INSTALLMENTS;
  const installmentPrincipal = settlement.finalPrice;
  const monthlyDevice = installments > 0 ? Math.round(settlement.finalPrice / installments) : 0;
  const addOnMonthly = discount.addOnServices.reduce((sum, id) => {
    const addon = MOCK_ADDONS.find((a) => a.id === id);
    const price = addon?.price ?? 0;
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
