"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useContractStore,
  MOCK_MODELS,
  MOCK_PLANS,
  type JoinType,
} from "@/client/store/useContractStore";

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

function modelOptionKey(m: (typeof MOCK_MODELS)[0]) {
  return `${m.name} ${m.capacity}`;
}

export function Step2DevicePlan() {
  const device = useContractStore((s) => s.device);
  const plan = useContractStore((s) => s.plan);
  const settlement = useContractStore((s) => s.settlement);
  const setDevice = useContractStore((s) => s.setDevice);
  const setPlan = useContractStore((s) => s.setPlan);

  const currentMock = MOCK_MODELS.find(
    (m) => modelOptionKey(m) === (device.model && device.capacity ? `${device.model} ${device.capacity}` : device.model)
  );

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) {
      setDevice({ model: "", capacity: "", color: "", factory_price: 0, subsidy: 0 });
      return;
    }
    const mock = MOCK_MODELS.find((m) => modelOptionKey(m) === value);
    if (mock) {
      setDevice({
        model: mock.name,
        capacity: mock.capacity,
        color: mock.colors[0] ?? "",
        factory_price: mock.factory_price,
        subsidy: mock.defaultSubsidy,
      });
    }
  };

  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setPlan({ planName: name });
  };

  const displayModelValue = device.model && device.capacity ? `${device.model} ${device.capacity}` : device.model || "";

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
              {MOCK_MODELS.map((m) => (
                <option key={m.id} value={modelOptionKey(m)}>
                  {m.name} {m.capacity}
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
              {(currentMock?.colors ?? []).map((c) => (
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
              {MOCK_PLANS.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} ({p.monthlyFee.toLocaleString()}원/월)
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
