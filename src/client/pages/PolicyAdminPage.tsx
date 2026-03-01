/**
 * 정책 관리 페이지
 * 
 * 역할:
 * - 기기 모델 정책 관리 (출고가, 공시지원금 등)
 * - 요금제 정책 관리 (월 요금, 리베이트)
 * - 부가서비스 정책 관리 (가격)
 * - 정책 실시간 수정 및 저장
 * 
 * 접근 권한:
 * - super_admin: 모든 정책 관리 가능
 * - tenant_admin: 향후 매장별 정책 관리 가능 (현재는 전체 정책 공유)
 * 
 * 특징:
 * - 정책 수정 시 즉시 모든 견적기에 반영됨
 * - localStorage에 저장되어 새로고침해도 유지됨
 * 
 * @file PolicyAdminPage.tsx
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePolicyStore } from "@/client/store/usePolicyStore";

/**
 * 정책 관리 페이지 컴포넌트
 * 
 * 관리자가 정책을 수정할 수 있는 UI를 제공합니다.
 * 수정된 정책은 즉시 모든 견적기에 반영됩니다.
 */
export default function PolicyAdminPage() {
  // 기기 정책 관리
  const devicePolicies = usePolicyStore((s) => s.devicePolicies);
  const updateDevicePolicy = usePolicyStore((s) => s.updateDevicePolicy);
  const addDevicePolicy = usePolicyStore((s) => s.addDevicePolicy);
  const deleteDevicePolicy = usePolicyStore((s) => s.deleteDevicePolicy);

  // 요금제 정책 관리
  const planPolicies = usePolicyStore((s) => s.planPolicies);
  const updatePlanPolicy = usePolicyStore((s) => s.updatePlanPolicy);
  const addPlanPolicy = usePolicyStore((s) => s.addPlanPolicy);
  const deletePlanPolicy = usePolicyStore((s) => s.deletePlanPolicy);

  // 부가서비스 정책 관리
  const addOnPolicies = usePolicyStore((s) => s.addOnPolicies);
  const updateAddOnPolicy = usePolicyStore((s) => s.updateAddOnPolicy);
  const addAddOnPolicy = usePolicyStore((s) => s.addAddOnPolicy);
  const deleteAddOnPolicy = usePolicyStore((s) => s.deleteAddOnPolicy);

  // 편집 중인 항목 추적
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null);

  // 새 항목 추가 모드
  const [newDeviceMode, setNewDeviceMode] = useState(false);
  const [newPlanMode, setNewPlanMode] = useState(false);
  const [newAddOnMode, setNewAddOnMode] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          정책/단가 관리
        </h1>
        <p className="mt-1 text-muted-foreground">
          기기 출고가, 공시지원금, 요금제 리베이트 등을 관리합니다. 본사·지점장·매장주가 입력한 정책단가는 해당 권한 범위에서 반영됩니다.
        </p>
      </div>

      {/* 기기 모델 정책 관리 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>기기 모델 정책</CardTitle>
              <CardDescription>
                각 기기 모델별 출고가, 공시지원금, 색상 옵션을 설정합니다.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewDeviceMode(true);
                setEditingDeviceId(null);
              }}
            >
              + 모델 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {devicePolicies.map((policy) => (
              <div
                key={policy.id}
                className="rounded-lg border border-border p-4"
              >
                {editingDeviceId === policy.id ? (
                  <DevicePolicyEditForm
                    policy={policy}
                    onSave={(updates) => {
                      updateDevicePolicy(policy.id, updates);
                      setEditingDeviceId(null);
                    }}
                    onCancel={() => setEditingDeviceId(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
                        {policy.name} {policy.capacity}
                      </h3>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                        <div>
                          <span className="text-muted-foreground">출고가:</span>
                          <p className="font-medium tabular-nums">
                            {policy.factory_price.toLocaleString()}원
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">공시지원금:</span>
                          <p className="font-medium tabular-nums text-primary">
                            {policy.defaultSubsidy.toLocaleString()}원
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">색상:</span>
                          <p className="font-medium">{policy.colors.join(", ")}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">수정일:</span>
                          <p className="text-xs text-muted-foreground">
                            {new Date(policy.updatedAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingDeviceId(policy.id)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("이 모델 정책을 삭제하시겠습니까?")) {
                            deleteDevicePolicy(policy.id);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {newDeviceMode && (
              <div className="rounded-lg border border-dashed border-border p-4">
                <DevicePolicyEditForm
                  onSave={(data) => {
                    addDevicePolicy(data);
                    setNewDeviceMode(false);
                  }}
                  onCancel={() => setNewDeviceMode(false)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 요금제 정책 관리 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>요금제 정책</CardTitle>
              <CardDescription>
                각 요금제별 월 요금과 리베이트를 설정합니다.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewPlanMode(true);
                setEditingPlanId(null);
              }}
            >
              + 요금제 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {planPolicies.map((policy) => (
              <div
                key={policy.id}
                className="rounded-lg border border-border p-4"
              >
                {editingPlanId === policy.id ? (
                  <PlanPolicyEditForm
                    policy={policy}
                    onSave={(updates) => {
                      updatePlanPolicy(policy.id, updates);
                      setEditingPlanId(null);
                    }}
                    onCancel={() => setEditingPlanId(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{policy.name}</h3>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                        <div>
                          <span className="text-muted-foreground">월 요금:</span>
                          <p className="font-medium tabular-nums">
                            {policy.monthlyFee.toLocaleString()}원
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">리베이트:</span>
                          <p className="font-medium tabular-nums text-primary">
                            {policy.rebate.toLocaleString()}원
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">수정일:</span>
                          <p className="text-xs text-muted-foreground">
                            {new Date(policy.updatedAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPlanId(policy.id)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("이 요금제 정책을 삭제하시겠습니까?")) {
                            deletePlanPolicy(policy.id);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {newPlanMode && (
              <div className="rounded-lg border border-dashed border-border p-4">
                <PlanPolicyEditForm
                  onSave={(data) => {
                    addPlanPolicy(data);
                    setNewPlanMode(false);
                  }}
                  onCancel={() => setNewPlanMode(false)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 부가서비스 정책 관리 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>부가서비스 정책</CardTitle>
              <CardDescription>
                각 부가서비스별 가격을 설정합니다. (0원이면 무료 프로모션)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewAddOnMode(true);
                setEditingAddOnId(null);
              }}
            >
              + 부가서비스 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {addOnPolicies.map((policy) => (
              <div
                key={policy.id}
                className="rounded-lg border border-border p-4"
              >
                {editingAddOnId === policy.id ? (
                  <AddOnPolicyEditForm
                    policy={policy}
                    onSave={(updates) => {
                      updateAddOnPolicy(policy.id, updates);
                      setEditingAddOnId(null);
                    }}
                    onCancel={() => setEditingAddOnId(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{policy.name}</h3>
                      <div className="mt-2 flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">가격:</span>
                          <p className="font-medium tabular-nums">
                            {policy.price > 0
                              ? `${policy.price.toLocaleString()}원`
                              : "무료"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">수정일:</span>
                          <p className="text-xs text-muted-foreground">
                            {new Date(policy.updatedAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingAddOnId(policy.id)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("이 부가서비스 정책을 삭제하시겠습니까?")) {
                            deleteAddOnPolicy(policy.id);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {newAddOnMode && (
              <div className="rounded-lg border border-dashed border-border p-4">
                <AddOnPolicyEditForm
                  onSave={(data) => {
                    addAddOnPolicy(data);
                    setNewAddOnMode(false);
                  }}
                  onCancel={() => setNewAddOnMode(false)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 기기 정책 편집 폼 컴포넌트
 */
function DevicePolicyEditForm({
  policy,
  onSave,
  onCancel,
}: {
  policy?: { name: string; capacity: string; factory_price: number; defaultSubsidy: number; colors: string[] };
  onSave: (data: { name: string; capacity: string; factory_price: number; defaultSubsidy: number; colors: string[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(policy?.name ?? "");
  const [capacity, setCapacity] = useState(policy?.capacity ?? "");
  const [factoryPrice, setFactoryPrice] = useState(policy?.factory_price ?? 0);
  const [subsidy, setSubsidy] = useState(policy?.defaultSubsidy ?? 0);
  const [colors, setColors] = useState(policy?.colors.join(", ") ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !capacity.trim()) {
      alert("모델명과 용량을 입력해주세요.");
      return;
    }
    onSave({
      name: name.trim(),
      capacity: capacity.trim(),
      factory_price: factoryPrice,
      defaultSubsidy: subsidy,
      colors: colors.split(",").map((c) => c.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">모델명</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: iPhone 16"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">용량</label>
          <Input
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="예: 128GB"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">출고가 (원)</label>
          <Input
            type="number"
            value={factoryPrice || ""}
            onChange={(e) => setFactoryPrice(Number(e.target.value))}
            placeholder="0"
            inputMode="numeric"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">공시지원금 (원)</label>
          <Input
            type="number"
            value={subsidy || ""}
            onChange={(e) => setSubsidy(Number(e.target.value))}
            placeholder="0"
            inputMode="numeric"
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium">색상 (쉼표로 구분)</label>
          <Input
            value={colors}
            onChange={(e) => setColors(e.target.value)}
            placeholder="예: 블랙, 화이트, 블루"
            required
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">저장</Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}

/**
 * 요금제 정책 편집 폼 컴포넌트
 */
function PlanPolicyEditForm({
  policy,
  onSave,
  onCancel,
}: {
  policy?: { name: string; monthlyFee: number; rebate: number };
  onSave: (data: { name: string; monthlyFee: number; rebate: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(policy?.name ?? "");
  const [monthlyFee, setMonthlyFee] = useState(policy?.monthlyFee ?? 0);
  const [rebate, setRebate] = useState(policy?.rebate ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("요금제명을 입력해주세요.");
      return;
    }
    onSave({
      name: name.trim(),
      monthlyFee,
      rebate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">요금제명</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 5G 프리미어 올인원"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">월 요금 (원)</label>
          <Input
            type="number"
            value={monthlyFee || ""}
            onChange={(e) => setMonthlyFee(Number(e.target.value))}
            placeholder="0"
            inputMode="numeric"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">리베이트 (원)</label>
          <Input
            type="number"
            value={rebate || ""}
            onChange={(e) => setRebate(Number(e.target.value))}
            placeholder="0"
            inputMode="numeric"
            required
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">저장</Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}

/**
 * 부가서비스 정책 편집 폼 컴포넌트
 */
function AddOnPolicyEditForm({
  policy,
  onSave,
  onCancel,
}: {
  policy?: { name: string; price: number };
  onSave: (data: { name: string; price: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(policy?.name ?? "");
  const [price, setPrice] = useState(policy?.price ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("부가서비스명을 입력해주세요.");
      return;
    }
    onSave({
      name: name.trim(),
      price,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">부가서비스명</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 케어플러스 12개월"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">가격 (원, 0이면 무료)</label>
          <Input
            type="number"
            value={price || ""}
            onChange={(e) => setPrice(Number(e.target.value))}
            placeholder="0"
            inputMode="numeric"
            required
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">저장</Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}
