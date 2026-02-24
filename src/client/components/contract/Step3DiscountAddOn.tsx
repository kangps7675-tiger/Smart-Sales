/**
 * Step 3: 할인 및 부가서비스 선택 컴포넌트
 * 
 * 역할:
 * - 결합 할인 적용 여부 선택
 * - 부가서비스 선택 (다중 선택 가능)
 * - 월 납부금 시뮬레이션 표시
 * - 매장 마진 미리보기
 * 
 * 특징:
 * - 부가서비스 선택 시 매장 마진 자동 재계산
 * - 월 납부금 실시간 업데이트
 * - 무료 부가서비스 표시
 * 
 * @file Step3DiscountAddOn.tsx
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContractStore } from "@/client/store/useContractStore";
import { usePolicyStore } from "@/client/store/usePolicyStore";

/**
 * Step 3: 할인 및 부가서비스 선택 컴포넌트
 * 
 * 계약 생성 마법사의 세 번째 단계로,
 * 할인 및 부가서비스를 선택하고 최종 가격을 확인할 수 있습니다.
 */
export function Step3DiscountAddOn() {
  const discount = useContractStore((s) => s.discount);
  const plan = useContractStore((s) => s.plan);
  const settlement = useContractStore((s) => s.settlement);
  const setDiscount = useContractStore((s) => s.setDiscount);
  
  // 정책 스토어에서 최신 정책 데이터 가져오기
  const addOnPolicies = usePolicyStore((s) => s.addOnPolicies);
  const getPlanPolicyByName = usePolicyStore((s) => s.getPlanPolicyByName);
  const getAddOnPolicyById = usePolicyStore((s) => s.getAddOnPolicyById);

  // 선택한 요금제의 월 요금 조회 (정책 스토어에서)
  const selectedPlanPolicy = getPlanPolicyByName(plan.planName);
  const monthlyFee = selectedPlanPolicy?.monthlyFee ?? 0;

  /**
   * 부가서비스 토글 핸들러
   */
  const toggleAddOn = (id: string) => {
    const current = discount.addOnServices;
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    setDiscount({ addOnServices: next });
  };

  /**
   * 선택한 부가서비스들의 총 가격 계산 (정책 스토어에서)
   */
  const addOnTotal = discount.addOnServices.reduce((sum, id) => {
    const addonPolicy = getAddOnPolicyById(id);
    return sum + (addonPolicy?.price ?? 0);
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
            {addOnPolicies.map((policy) => (
              <li key={policy.id}>
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2.5 hover:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={discount.addOnServices.includes(policy.id)}
                      onChange={() => toggleAddOn(policy.id)}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{policy.name}</span>
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {policy.price > 0 ? `${policy.price.toLocaleString()}원` : "무료"}
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
