/**
 * 추가 할인 페이지
 * 매장별 추가 할인 항목을 등록·관리합니다. 판매일보 한 건 추가 시 드롭다운으로 선택해 층층이 적용됩니다.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/client/store/useAuthStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DiscountRow = { id: string; shop_id: string; name: string; amount: number; display_order: number };

export default function DiscountsPage() {
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);
  const shops = typeof getShopsForCurrentUser === "function" ? getShopsForCurrentUser() : [];
  const userShopId = user?.shopId ?? "";
  const isBranchUser = user?.role === "tenant_admin" || user?.role === "staff";
  const canSelectShop = user?.role === "super_admin";
  const [selectedShopId, setSelectedShopId] = useState((userShopId || shops[0]?.id) ?? "");
  const shopId = isBranchUser ? userShopId : ((selectedShopId || userShopId || shops[0]?.id) ?? "");

  const [list, setList] = useState<DiscountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchList = useCallback(async () => {
    if (!shopId) {
      setList([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/additional-discounts?shop_id=${encodeURIComponent(shopId)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => []);
      setList(Array.isArray(data) ? data : []);
    } catch {
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !addName.trim()) {
      setMessage({ type: "error", text: "할인명을 입력하세요." });
      return;
    }
    const amount = Number(addAmount);
    if (Number.isNaN(amount) || amount < 0) {
      setMessage({ type: "error", text: "금액을 0 이상 숫자로 입력하세요." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/additional-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: shopId, name: addName.trim(), amount }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: (json?.error ?? "등록 실패") as string });
        return;
      }
      setAddName("");
      setAddAmount("");
      setMessage({ type: "success", text: "추가 할인 항목을 등록했습니다." });
      fetchList();
    } catch {
      setMessage({ type: "error", text: "등록 중 오류가 발생했습니다." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 추가 할인 항목을 삭제할까요?")) return;
    try {
      const res = await fetch(`/api/additional-discounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      setMessage({ type: "success", text: "삭제했습니다." });
      fetchList();
    } catch {
      setMessage({ type: "error", text: "삭제 중 오류가 발생했습니다." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">추가 할인</h1>
          <p className="mt-2 text-muted-foreground">
            매장별 추가 할인 항목을 등록합니다. 판매일보 한 건 추가 시 드롭다운으로 선택해 층층이 적용됩니다.
          </p>
        </div>
        {canSelectShop && shops.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">매장</label>
            <select
              value={selectedShopId}
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

      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
          role="alert"
        >
          {message.text}
        </p>
      )}

      {!shopId ? (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">매장을 선택하세요.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">항목 등록</CardTitle>
              <CardDescription>추가 할인 이름과 금액(원)을 입력하세요. 판매일보에서 선택 시 마진에서 차감됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">할인명</label>
                  <Input
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="예: 신규가입 할인"
                    className="h-9 w-48"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">금액(원)</label>
                  <Input
                    type="number"
                    min={0}
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="0"
                    className="h-9 w-28"
                  />
                </div>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "등록 중…" : "등록"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">등록된 추가 할인</CardTitle>
              <CardDescription>아래 항목이 판매일보 한 건 추가 시 드롭다운에 표시됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">불러오는 중…</p>
              ) : list.length === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 항목이 없습니다. 위에서 항목을 등록하세요.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="pb-2 text-left font-medium text-muted-foreground">할인명</th>
                        <th className="pb-2 text-right font-medium text-muted-foreground">금액(원)</th>
                        <th className="w-20 pb-2 text-right font-medium text-muted-foreground">동작</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((row) => (
                        <tr key={row.id} className="border-b border-border/30">
                          <td className="py-2">{row.name}</td>
                          <td className="py-2 text-right tabular-nums">{Number(row.amount).toLocaleString()}</td>
                          <td className="py-2 text-right">
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors"
                              onClick={() => handleDelete(row.id)}
                            >
                              삭제
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
