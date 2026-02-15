"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/client/store/useAuthStore";

export default function CustomerInvitePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const registeredShops = useAuthStore((s) => s.registeredShops);
  const customerInvites = useAuthStore((s) => s.customerInvites);

  const shops = useMemo(
    () => useAuthStore.getState().getShopsForCurrentUser(),
    [registeredShops, user?.id, user?.shopId]
  );
  const firstShopId = shops[0]?.id ?? null;

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [newCustomerInvite, setNewCustomerInvite] = useState<{ code: string; shopName: string } | null>(null);

  const canAccess = user && (user.role === "tenant_admin" || user.role === "super_admin" || (user.role === "staff" && !!user.shopId));

  useEffect(() => {
    if (!user) router.replace("/login");
    else if (!canAccess) router.replace("/dashboard");
  }, [user, canAccess, router]);

  useEffect(() => {
    if (firstShopId && !selectedShopId) setSelectedShopId(firstShopId);
  }, [firstShopId, selectedShopId]);

  const handleCreateCustomerInvite = () => {
    if (!selectedShopId) return;
    const inv = useAuthStore.getState().createCustomerInvite(selectedShopId);
    if (inv) setNewCustomerInvite({ code: inv.code, shopName: inv.shopName });
  };

  const myCustomerInvites = selectedShopId ? customerInvites.filter((i) => i.shopId === selectedShopId) : [];

  if (!user || !canAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        접근 권한을 확인 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">고객 초대</h1>
        <p className="mt-1 text-muted-foreground">고객 초대 코드를 발급해 해당 매장 고객으로 가입할 수 있게 하세요.</p>
      </div>

      {user.role === "super_admin" && shops.length > 1 && (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <label className="text-sm font-medium">매장 선택</label>
            <select
              className="mt-2 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedShopId ?? ""}
              onChange={(e) => setSelectedShopId(e.target.value || null)}
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>고객 초대 코드 발급</CardTitle>
          <CardDescription>고객이 로그인 화면의 고객 가입 탭에서 이 코드를 입력하면 해당 매장 고객으로 가입합니다. 7일간 유효합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleCreateCustomerInvite} disabled={!selectedShopId}>새 고객 초대 코드 발급</Button>
          {newCustomerInvite && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm font-medium">발급된 코드 (매장: {newCustomerInvite.shopName})</p>
              <p className="mt-2 font-mono text-2xl tracking-wider text-primary">{newCustomerInvite.code}</p>
              <p className="mt-1 text-xs text-muted-foreground">고객에게 전달 후 로그인 페이지 → 고객 가입 탭에서 입력하세요.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>미사용 고객 초대 코드</CardTitle>
        </CardHeader>
        <CardContent>
          {myCustomerInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">없음</p>
          ) : (
            <ul className="space-y-2">
              {myCustomerInvites.map((i) => (
                <li key={i.code} className="flex justify-between rounded border border-border px-3 py-2 text-sm">
                  <span className="font-mono">{i.code}</span>
                  <span className="text-muted-foreground">{new Date(i.expiresAt).toLocaleDateString("ko-KR")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
