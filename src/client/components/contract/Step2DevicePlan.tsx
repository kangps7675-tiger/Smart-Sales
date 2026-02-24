/**
 * Step 2: 기기 및 요금제 선택 컴포넌트
 * 
 * 역할:
 * - 기기 모델, 용량, 색상 선택
 * - IMEI 번호 입력
 * - 요금제 선택 및 가입 유형 설정
 * - 공시지원금/선택약정 적용 여부 선택
 * - 실시간 정산 미리보기 표시
 * 
 * 특징:
 * - 모델 선택 시 출고가와 공시지원금 자동 설정
 * - 요금제 선택 시 리베이트 자동 반영
 * - 정산 정보 실시간 업데이트
 * 
 * @file Step2DevicePlan.tsx
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useContractStore,
  type JoinType,
} from "@/client/store/useContractStore";
import { usePolicyStore } from "@/client/store/usePolicyStore";

/**
 * 공통 select 요소 스타일 클래스
 */
const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/**
 * 모델 옵션 키 생성 함수
 * 
 * 모델명과 용량을 조합하여 select 옵션의 value로 사용합니다.
 * 
 * @param policy - 기기 정책 객체
 * @returns "모델명 용량" 형식의 문자열
 */
function modelOptionKey(policy: { name: string; capacity: string }) {
  return `${policy.name} ${policy.capacity}`;
}

/**
 * Step 2: 기기 및 요금제 선택 컴포넌트
 * 
 * 계약 생성 마법사의 두 번째 단계로,
 * 기기와 요금제를 선택하고 정산 정보를 미리 확인할 수 있습니다.
 */
export function Step2DevicePlan() {
  const device = useContractStore((s) => s.device);
  const plan = useContractStore((s) => s.plan);
  const settlement = useContractStore((s) => s.settlement);
  const setDevice = useContractStore((s) => s.setDevice);
  const setPlan = useContractStore((s) => s.setPlan);
  
  // 정책 스토어에서 최신 정책 데이터 가져오기
  const devicePolicies = usePolicyStore((s) => s.devicePolicies);
  const planPolicies = usePolicyStore((s) => s.planPolicies);

  // 현재 선택된 기기 정책 찾기
  const currentDevicePolicy = devicePolicies.find(
    (p) => p.name === device.model && p.capacity === device.capacity
  );

  /**
   * 기기 모델 변경 핸들러
   * 
   * 정책 스토어에서 선택한 모델의 정책을 가져와서
   * 출고가와 공시지원금을 자동으로 설정합니다.
   */
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) {
      setDevice({ model: "", capacity: "", color: "", factory_price: 0, subsidy: 0 });
      return;
    }
    // 정책 스토어에서 선택한 모델 정책 찾기
    const policy = devicePolicies.find((p) => modelOptionKey(p) === value);
    if (policy) {
      setDevice({
        model: policy.name,
        capacity: policy.capacity,
        color: policy.colors[0] ?? "",
        factory_price: policy.factory_price,
        subsidy: policy.defaultSubsidy,
      });
    }
  };

  /**
   * 요금제 변경 핸들러
   */
  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setPlan({ planName: name });
  };

  const displayModelValue = device?.model && device?.capacity ? `${device.model} ${device.capacity}` : (device?.model ?? "");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">단말기</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="step2-model" className="text-sm font-medium text-muted-foreground">
              모델
            </label>
            <select
              id="step2-model"
              value={displayModelValue}
              onChange={handleModelChange}
              className={selectClassName}
            >
              <option value="">선택하세요</option>
              {devicePolicies.map((policy) => (
                <option key={policy.id} value={modelOptionKey(policy)}>
                  {policy.name} {policy.capacity}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="step2-color" className="text-sm font-medium text-muted-foreground">
              색상
            </label>
            <select
              id="step2-color"
              value={device.color}
              onChange={(e) => setDevice({ color: e.target.value })}
              className={selectClassName}
            >
              <option value="">선택하세요</option>
              {(currentDevicePolicy?.colors ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="step2-imei" className="text-sm font-medium text-muted-foreground">
              IMEI (일련번호)
            </label>
            <Input
              id="step2-imei"
              value={device.imei}
              onChange={(e) => setDevice({ imei: e.target.value })}
              placeholder="15자리 숫자"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={15}
            />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">출고가</span>
            <p className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm tabular-nums">
              {device.factory_price > 0 ? `${device.factory_price.toLocaleString()}원` : "—"}
            </p>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">공시지원금</span>
            <p className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm tabular-nums">
              {device.subsidy > 0 ? `${device.subsidy.toLocaleString()}원` : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">요금제</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="step2-plan" className="text-sm font-medium text-muted-foreground">
              요금제
            </label>
            <select
              id="step2-plan"
              value={plan.planName}
              onChange={handlePlanChange}
              className={selectClassName}
            >
              <option value="">선택하세요</option>
              {planPolicies.map((policy) => (
                <option key={policy.id} value={policy.name}>
                  {policy.name} ({policy.monthlyFee.toLocaleString()}원/월)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">가입 유형</span>
            <div className="flex gap-4 pt-2">
              {(["번호이동", "기기변경"] as JoinType[]).map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="joinType"
                    value={opt}
                    checked={plan.joinType === opt}
                    onChange={() => setPlan({ joinType: opt })}
                    className="rounded-full border-input"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="step2-subsidy"
              type="checkbox"
              checked={plan.isSubsidy}
              onChange={(e) => setPlan({ isSubsidy: e.target.checked })}
              className="rounded border-input"
            />
            <label htmlFor="step2-subsidy" className="text-sm">
              공시지원금/선택약정 적용
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">실시간 정산 미리보기</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">최종 판매가(고객 부담)</dt>
            <dd className="tabular-nums font-medium">{settlement.finalPrice.toLocaleString()}원</dd>
            <dt className="text-muted-foreground">정책 리베이트</dt>
            <dd className="tabular-nums">{settlement.rebate.toLocaleString()}원</dd>
            <dt className="text-muted-foreground">매장 마진</dt>
            <dd className="tabular-nums font-medium text-primary">{settlement.margin.toLocaleString()}원</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
