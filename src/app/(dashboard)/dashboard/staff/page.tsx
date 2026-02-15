"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore, ROLE_LABEL } from "@/client/store/useAuthStore";

export default function StaffPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const registeredShops = useAuthStore((s) => s.registeredShops);
  const registeredUsers = useAuthStore((s) => s.registeredUsers);
  const invites = useAuthStore((s) => s.invites);
  const customerInvites = useAuthStore((s) => s.customerInvites);

  const shops = useMemo(
    () => useAuthStore.getState().getShopsForCurrentUser(),
    [registeredShops, user?.id, user?.shopId]
  );
  const firstShopId = shops[0]?.id ?? null;

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [newInvite, setNewInvite] = useState<{ code: string; shopName: string } | null>(null);
  const [newCustomerInvite, setNewCustomerInvite] = useState<{ code: string; shopName: string } | null>(null);

  const canManage = user?.role === "tenant_admin" || user?.role === "super_admin";

  useEffect(() => {
    if (!user) router.replace("/login");
    else if (!canManage) router.replace("/dashboard");
  }, [user, canManage, router]);

  useEffect(() => {
    if (firstShopId && !selectedShopId) setSelectedShopId(firstShopId);
  }, [firstShopId, selectedShopId]);

  const handleCreateInvite = () => {
    if (!selectedShopId) return;
    const inv = useAuthStore.getState().createInvite(selectedShopId);
    if (inv) setNewInvite({ code: inv.code, shopName: inv.shopName });
  };

  const handleCreateCustomerInvite = () => {
    if (!selectedShopId) return;
    const inv = useAuthStore.getState().createCustomerInvite(selectedShopId);
    if (inv) setNewCustomerInvite({ code: inv.code, shopName: inv.shopName });
  };

  const myInvites = selectedShopId ? invites.filter((i) => i.shopId === selectedShopId) : [];
  const myCustomerInvites = selectedShopId ? customerInvites.filter((i) => i.shopId === selectedShopId) : [];
  const staffInShop = selectedShopId
    ? registeredUsers.filter((u) => u.shopId === selectedShopId && u.role === "staff")
    : [];

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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">판매사 초대·관리</h1>
        <p className="mt-1 text-muted-foreground">초대 코드를 발급해 판매사가 가입할 수 있게 하세요.</p>
      </div>

      {user.role === "super_admin" && shops.length > 1 && (
        <Card className="border-border/80">
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

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>초대 코드 발급</CardTitle>
          <CardDescription>코드는 7일간 유효합니다. 판매사는 로그인 화면에서 초대 코드로 가입 탭에서 입력합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleCreateInvite} disabled={!selectedShopId}>새 초대 코드 발급</Button>
          {newInvite && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm font-medium">발급된 코드 (매장: {newInvite.shopName})</p>
              <p className="mt-2 font-mono text-2xl tracking-wider text-primary">{newInvite.code}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>미사용 초대 코드</CardTitle>
        </CardHeader>
        <CardContent>
          {myInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">없음</p>
          ) : (
            <ul className="space-y-2">
              {myInvites.map((i) => (
                <li key={i.code} className="flex justify-between rounded border border-border px-3 py-2 text-sm">
                  <span className="font-mono">{i.code}</span>
                  <span className="text-muted-foreground">{new Date(i.expiresAt).toLocaleDateString("ko-KR")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>소속 판매사</CardTitle>
        </CardHeader>
        <CardContent>
          {staffInShop.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 가입한 판매사가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {staffInShop.map((u) => (
                <li key={u.id} className="flex justify-between rounded border border-border px-3 py-2 text-sm">
                  <span>{u.name} ({u.loginId})</span>
                  <span className="text-muted-foreground">{ROLE_LABEL[u.role]}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80">
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

      <Card className="border-border/80">
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
