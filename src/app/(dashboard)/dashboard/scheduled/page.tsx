"use client";

/**
 * 예정건 전용 페이지
 * - 개통여부 △(예정건)인 상담만 목록
 */

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/client/store/useAuthStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Consultation = {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  product_name: string | null;
  memo: string | null;
  consultation_date: string;
  sales_person: string | null;
  activation_status: string;
  created_at: string;
};

export default function ScheduledPage() {
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);
  const shops = getShopsForCurrentUser();
  const userShopId = user?.shopId ?? "";

  const [list, setList] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState((userShopId || shops[0]?.id) ?? "");

  const isSuperAdmin = user?.role === "super_admin";
  const isRegionManager = user?.role === "region_manager";
  const isBranchUser = user?.role === "tenant_admin" || user?.role === "staff";
  const canSelectShop = isSuperAdmin || isRegionManager;
  const shopId = isBranchUser ? userShopId : ((selectedShopId || userShopId || shops[0]?.id) ?? "");

  const fetchList = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/crm/consultations?shop_id=${encodeURIComponent(shopId)}&activation_status=△`,
      );
      if (!res.ok) throw new Error("예정건 목록을 불러올 수 없습니다.");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (canSelectShop && shops.length > 0 && !selectedShopId) setSelectedShopId(shops[0].id);
  }, [canSelectShop, shops, selectedShopId]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">예정건</h1>
          <p className="mt-2 text-muted-foreground">
            개통여부 △(예정건)으로 등록된 상담만 모아봅니다. 개통 시 상담(CRM)에서 O로 변경 후 판매일보로 이동할 수 있습니다.
          </p>
        </div>
        {canSelectShop && shops.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">매장 선택</label>
            <select
              value={shopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="flex h-9 min-w-[12rem] rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}

      <Card className="border-border/70">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">예정건 목록</CardTitle>
            <CardDescription>
              상담(CRM)에서 개통여부를 △로 두면 여기에 표시됩니다.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Link href="/dashboard/crm">상담(CRM)으로 이동</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!shopId ? (
            <p className="text-sm text-muted-foreground">매장을 선택하세요.</p>
          ) : loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              예정건이 없습니다. 상담(CRM)에서 개통여부를 △로 등록해 보세요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 font-medium text-muted-foreground">고객명</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">연락처</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">상담일</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">담당</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">상품/메모</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{c.phone ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{c.consultation_date?.slice(0, 10) ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.sales_person ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {[c.product_name, c.memo].filter(Boolean).join(" / ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
