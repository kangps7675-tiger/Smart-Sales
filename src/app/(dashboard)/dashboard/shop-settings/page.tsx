/**
 * 매장 설정 페이지
 * 
 * 역할:
 * - 매장별 마진 정책 설정
 * - 실적 목표 설정
 * - 매장 정보 관리
 * 
 * 접근 권한:
 * - tenant_admin: 본인 매장 설정만 가능
 * - region_manager: 담당 지점 매장 설정 가능
 * - super_admin: 모든 매장 설정 가능
 * - staff: 접근 불가 (대시보드로 리다이렉트)
 * 
 * @file page.tsx
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/client/store/useAuthStore";

interface ShopSettingsDto {
  shop_id: string;
  margin_rate_pct: number;
  sales_target_monthly: number;
  per_sale_incentive: number;
  updated_at?: string;
}

/**
 * 매장 설정 페이지 컴포넌트
 *
 * 매장주·지점장·슈퍼 어드민이 매장별 마진률, 실적 목표, 건당 인센티브를 설정합니다.
 */
export default function ShopSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);

  const canManage = user?.role === "tenant_admin" || user?.role === "super_admin" || user?.role === "region_manager";
  const shops = getShopsForCurrentUser();
  const canSelectShop = user?.role === "super_admin" || user?.role === "region_manager";
  const [selectedShopId, setSelectedShopId] = useState("");
  const [settings, setSettings] = useState<ShopSettingsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!canManage) {
      router.replace("/dashboard");
      return;
    }
  }, [user, canManage, router]);

  useEffect(() => {
    if (!user || !canManage || selectedShopId) return;
    if (canSelectShop && shops[0]) setSelectedShopId(shops[0].id);
    else if (user.shopId) setSelectedShopId(user.shopId);
  }, [user, canManage, canSelectShop, shops, selectedShopId]);

  const loadSettings = useCallback(async (shopId: string) => {
    if (!shopId || !user) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        "x-user-role": user.role,
      };
      if (user.shopId) headers["x-user-shop-id"] = user.shopId;
      if (user.storeGroupId) headers["x-store-group-id"] = user.storeGroupId;
      const res = await fetch(`/api/shop-settings?shop_id=${encodeURIComponent(shopId)}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setSettings(json as ShopSettingsDto);
      else setSettings(null);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedShopId) loadSettings(selectedShopId);
    else setSettings(null);
  }, [selectedShopId, loadSettings]);

  const handleSave = async () => {
    if (!selectedShopId || !user || !settings) return;
    setSaving(true);
    setToast(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-role": user.role,
      };
      if (user.shopId) headers["x-user-shop-id"] = user.shopId;
      if (user.storeGroupId) headers["x-store-group-id"] = user.storeGroupId;
      const res = await fetch("/api/shop-settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          shop_id: selectedShopId,
          margin_rate_pct: settings.margin_rate_pct,
          sales_target_monthly: settings.sales_target_monthly,
          per_sale_incentive: settings.per_sale_incentive,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setSettings((prev) => (prev ? { ...prev, ...json } : null));
        setToast({ type: "success", text: "저장되었습니다." });
      } else {
        setToast({ type: "error", text: (json?.error as string) ?? "저장에 실패했습니다." });
      }
    } catch {
      setToast({ type: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

  if (!user || !canManage) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        접근 권한을 확인 중입니다...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          매장 설정
        </h1>
        <p className="mt-1 text-muted-foreground">
          본인 매장의 마진 정책, 실적 목표 등을 설정합니다. 판매사에게는 이 메뉴가 보이지 않습니다.
        </p>
      </div>

      {(user.role === "tenant_admin" && user.shopId) || user.role === "region_manager" || user.role === "super_admin" ? (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>{user.role === "tenant_admin" ? "내 매장" : "매장 목록"}</CardTitle>
            <CardDescription>
              {user.role === "tenant_admin"
                ? "현재 로그인한 매장주 계정의 소속 매장입니다."
                : "설정할 매장을 선택하세요."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canSelectShop && shops.length > 1 ? (
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              shops.map((s) => (
                <p key={s.id} className="font-medium text-foreground">{s.name}</p>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {selectedShopId && (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>매장 마진·실적 설정</CardTitle>
            <CardDescription>
              이 매장에만 적용되는 마진률, 월 실적 목표, 건당 인센티브입니다. 판매일보 급여 계산에 반영됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">불러오는 중...</p>
            ) : settings ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="margin_rate">마진 반영률 (%)</Label>
                    <Input
                      id="margin_rate"
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={settings.margin_rate_pct}
                      onChange={(e) => setSettings((s) => s ? { ...s, margin_rate_pct: Number(e.target.value) || 0 } : null)}
                    />
                    <p className="text-xs text-muted-foreground">마진의 N%를 급여에 반영 (0~100)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="per_sale">건당 인센티브 (원)</Label>
                    <Input
                      id="per_sale"
                      type="number"
                      min={0}
                      value={settings.per_sale_incentive}
                      onChange={(e) => setSettings((s) => s ? { ...s, per_sale_incentive: Number(e.target.value) || 0 } : null)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sales_target">월 실적 목표 (건수)</Label>
                  <Input
                    id="sales_target"
                    type="number"
                    min={0}
                    value={settings.sales_target_monthly}
                    onChange={(e) => setSettings((s) => s ? { ...s, sales_target_monthly: Number(e.target.value) || 0 } : null)}
                  />
                </div>
                {toast && (
                  <p className={`text-sm ${toast.type === "success" ? "text-green-600" : "text-destructive"}`}>
                    {toast.text}
                  </p>
                )}
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">설정을 불러올 수 없습니다.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>실적·목표</CardTitle>
          <CardDescription>위에서 월 실적 목표(건수)를 설정할 수 있습니다. 대시보드·판매일보에서 실적과 비교해 확인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">매장 선택 후 위 카드에서 실적 목표 건수를 입력하고 저장하세요.</p>
        </CardContent>
      </Card>
    </div>
  );
}
