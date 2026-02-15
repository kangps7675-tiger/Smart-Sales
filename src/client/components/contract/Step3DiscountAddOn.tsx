"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContractStore, MOCK_ADDONS, MOCK_PLANS } from "@/client/store/useContractStore";

export function Step3DiscountAddOn() {
  const discount = useContractStore((s) => s.discount);
  const plan = useContractStore((s) => s.plan);
  const settlement = useContractStore((s) => s.settlement);
  const setDiscount = useContractStore((s) => s.setDiscount);

  const selectedPlan = MOCK_PLANS.find((p) => p.name === plan.planName);
  const monthlyFee = selectedPlan?.monthlyFee ?? 0;

  const toggleAddOn = (id: string) => {
    const current = discount.addOnServices;
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    setDiscount({ addOnServices: next });
  };

  const addOnTotal = discount.addOnServices.reduce((sum, id) => {
    const addon = MOCK_ADDONS.find((a) => a.id === id);
    return sum + (addon?.price ?? 0);
  }, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">할인</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={discount.combinedDiscount}
              onChange={(e) => setDiscount({ combinedDiscount: e.target.checked })}
              className="rounded border-input"
            />
            <span className="text-sm">결합 할인 적용</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">부가서비스</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {MOCK_ADDONS.map((addon) => (
              <li key={addon.id}>
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2.5 hover:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={discount.addOnServices.includes(addon.id)}
                      onChange={() => toggleAddOn(addon.id)}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{addon.name}</span>
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {addon.price > 0 ? `${addon.price.toLocaleString()}원` : "무료"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">월 납부금 시뮬레이션</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">요금제 월 납부금</dt>
            <dd className="tabular-nums">{monthlyFee.toLocaleString()}원</dd>
            <dt className="text-muted-foreground">부가서비스 합계</dt>
            <dd className="tabular-nums">{addOnTotal.toLocaleString()}원</dd>
            <dt className="text-muted-foreground">최종 판매가 (기기)</dt>
            <dd className="tabular-nums font-medium">{settlement.finalPrice.toLocaleString()}원</dd>
            <dt className="text-muted-foreground">매장 마진</dt>
            <dd className="tabular-nums font-medium text-primary">{settlement.margin.toLocaleString()}원</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
