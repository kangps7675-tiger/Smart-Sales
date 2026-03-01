/**
 * 판매사 초대·관리 페이지 (직원용)
 *
 * 역할:
 * - 매장주가 발급하는 매장키(초대 코드) 생성 및 관리
 * - 소속 판매사 목록 조회
 *
 * 접근 권한:
 * - tenant_admin: 본인 매장만
 * - region_manager: 담당 지점 매장만
 * - super_admin: 모든 매장
 *
 * @file page.tsx
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore, ROLE_LABEL } from "@/client/store/useAuthStore";

/**
 * 판매사 초대·관리 페이지 컴포넌트
 * 매장주·슈퍼 어드민이 판매사용 매장키(초대 코드)를 발급합니다.
 */
export default function StaffPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const registeredShops = useAuthStore((s) => s.registeredShops);
  const registeredUsers = useAuthStore((s) => s.registeredUsers);
  const invites = useAuthStore((s) => s.invites);

  const shops = useMemo(
    () => useAuthStore.getState().getShopsForCurrentUser(),
    // getState()로 매번 최신값을 읽으므로 deps는 비워 둠
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registeredShops, user?.id, user?.shopId]
  );
  const firstShopId = shops[0]?.id ?? null;

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [newInvite, setNewInvite] = useState<{ code: string; shopName: string } | null>(null);

  const canManage = user?.role === "tenant_admin" || user?.role === "super_admin" || user?.role === "region_manager";

  useEffect(() => {
    if (!user) router.replace("/login");
    else if (!canManage) router.replace("/dashboard");
  }, [user, canManage, router]);

  useEffect(() => {
    if (firstShopId && !selectedShopId) setSelectedShopId(firstShopId);
  }, [firstShopId, selectedShopId]);

  /**
   * 판매사 초대 코드 생성 핸들러
   * 
   * 선택된 매장에 대한 판매사 초대 코드를 생성하고 표시합니다.
   */
  const handleCreateInvite = () => {
    if (!selectedShopId) return;
    const inv = useAuthStore.getState().createInvite(selectedShopId);
    if (inv) setNewInvite({ code: inv.code, shopName: inv.shopName });
  };

  const myInvites = selectedShopId ? invites.filter((i) => i.shopId === selectedShopId) : [];
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">판매사 초대·관리</h1>
        <p className="mt-2 text-muted-foreground">초대 코드를 발급해 판매사가 가입할 수 있게 하세요.</p>
      </div>

      {(user.role === "super_admin" || user.role === "region_manager") && shops.length > 1 && (
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
        <CardContent className="space-y-5">
          {shops.length === 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              소속 매장 정보가 없어 초대 코드를 발급할 수 없습니다. 로그인을 다시 하거나 관리자에게 문의하세요.
            </p>
          )}
          <Button onClick={handleCreateInvite} disabled={!selectedShopId} title={!selectedShopId ? "매장을 선택하면 발급할 수 있습니다" : undefined}>
            새 초대 코드 발급
          </Button>
          {newInvite && (
            <div className="rounded-lg border border-border bg-muted/50 p-5">
              <p className="text-sm font-medium">발급된 코드 (매장: {newInvite.shopName})</p>
              <p className="mt-3 font-mono text-2xl tracking-wider text-primary">{newInvite.code}</p>
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
            <ul className="space-y-3">
              {myInvites.map((i) => (
                <li key={i.code} className="flex justify-between rounded border border-border px-4 py-3 text-sm">
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
            <ul className="space-y-3">
              {staffInShop.map((u) => (
                <li key={u.id} className="flex justify-between rounded border border-border px-4 py-3 text-sm">
                  <span>{u.name} ({u.loginId})</span>
                  <span className="text-muted-foreground">{ROLE_LABEL[u.role]}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
