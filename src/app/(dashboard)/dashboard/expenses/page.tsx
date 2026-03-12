"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/client/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Expense = {
  id: string;
  shop_id: string;
  profile_id: string;
  buyer_name: string;
  expense_date: string;
  description: string;
  amount: number;
  memo: string | null;
  created_at: string;
};

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function ExpensesPage() {
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);
  const shops = getShopsForCurrentUser();
  const userShopId = user?.shopId ?? "";

  const isSuperAdmin = user?.role === "super_admin";
  const isBranchUser = user?.role === "tenant_admin" || user?.role === "staff";
  const canSelectShop = isSuperAdmin;
  const isOwnerOrAbove = user?.role === "tenant_admin" || user?.role === "super_admin";

  const [selectedShopId, setSelectedShopId] = useState((userShopId || shops[0]?.id) ?? "");
  const shopId = isBranchUser ? userShopId : ((selectedShopId || userShopId || shops[0]?.id) ?? "");

  const [month, setMonth] = useState(currentMonth);
  const [list, setList] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expenseDate, setExpenseDate] = useState(todayStr);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasInvitedStaff, setHasInvitedStaff] = useState(false);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchList = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/expenses?shop_id=${encodeURIComponent(shopId)}&month=${encodeURIComponent(month)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("지출 목록을 불러올 수 없습니다.");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [shopId, month]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (canSelectShop && shops.length > 0 && !selectedShopId) setSelectedShopId(shops[0].id);
  }, [canSelectShop, shops, selectedShopId]);

  useEffect(() => {
    if (!shopId || (user?.role !== "tenant_admin" && user?.role !== "super_admin")) return;
    fetch(`/api/shops/staff?shop_id=${shopId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((arr: unknown[]) => setHasInvitedStaff(arr.length > 0))
      .catch(() => setHasInvitedStaff(false));
  }, [shopId, user?.role]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    const trimmedDesc = description.trim();
    const numAmount = Number(amount);
    if (!trimmedDesc) { showToast("error", "적요를 입력해 주세요."); return; }
    if (!numAmount || numAmount <= 0) { showToast("error", "금액을 입력해 주세요."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: shopId,
          expense_date: expenseDate,
          description: trimmedDesc,
          amount: numAmount,
          memo: memo.trim() || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast("error", (json as Record<string, string>)?.error ?? "등록에 실패했습니다.");
        return;
      }
      showToast("success", "지출이 등록되었습니다.");
      setDescription("");
      setAmount("");
      setMemo("");
      fetchList();
    } catch {
      showToast("error", "등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, shopId, expenseDate, description, amount, memo, showToast, fetchList]);

  const handleDelete = useCallback(async (id: string) => {
    if (deleteLoadingId) return;
    if (typeof window !== "undefined" && !window.confirm("이 지출 내역을 삭제할까요?")) return;
    setDeleteLoadingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast("error", (json as Record<string, string>)?.error ?? "삭제에 실패했습니다.");
        return;
      }
      setList((prev) => prev.filter((e) => e.id !== id));
      showToast("success", "삭제되었습니다.");
    } catch {
      showToast("error", "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleteLoadingId(null);
    }
  }, [deleteLoadingId, showToast]);

  const summary = useMemo(() => {
    const total = list.reduce((sum, e) => sum + Number(e.amount), 0);
    const uniqueBuyers = new Set(list.map((e) => e.buyer_name || e.profile_id));
    const count = uniqueBuyers.size;
    const perPerson = count > 0 ? Math.round(total / count) : 0;
    return { total, count, perPerson };
  }, [list]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">지출</h1>
          <p className="mt-2 text-muted-foreground">
            매장 지출 내역을 등록하고 종합 조회할 수 있습니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canSelectShop && shops.length > 1 && (
            <div className="space-y-1">
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
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">월 선택</label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 min-w-[10rem]"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}

      {/* 등록 폼 */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">지출 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">지출일자</label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="h-9 w-[10rem]"
              />
            </div>
            <div className="flex-1 min-w-[10rem] space-y-1">
              <label className="text-xs font-medium text-muted-foreground">적요</label>
              <Input
                type="text"
                placeholder="폰와따몰, 퀵, 다이소 등"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">금액</label>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                className="h-9 w-[8rem]"
                min={0}
              />
            </div>
            <div className="flex-1 min-w-[8rem] space-y-1">
              <label className="text-xs font-medium text-muted-foreground">메모 (선택)</label>
              <Input
                type="text"
                placeholder="추가 메모"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                className="h-9"
              />
            </div>
            <Button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="h-9 px-5 transition-all hover:brightness-110 hover:shadow-sm active:scale-[0.97]"
            >
              {submitting ? "등록 중…" : "등록"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 요약 카드 (매장주 이상) */}
      {isOwnerOrAbove && list.length > 0 && (
        <div className={`grid grid-cols-1 gap-4 ${hasInvitedStaff ? "sm:grid-cols-3" : ""}`}>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">지출 합계</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{formatNumber(summary.total)}원</p>
            </CardContent>
          </Card>
          {hasInvitedStaff && (
            <Card className="border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">인원수</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{summary.count}명</p>
              </CardContent>
            </Card>
          )}
          {hasInvitedStaff && (
            <Card className="border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">인당</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{formatNumber(summary.perPerson)}원</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 종합 테이블 */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">
            {month} 지출 내역 ({list.length}건)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!shopId ? (
            <p className="text-sm text-muted-foreground">매장을 선택하세요.</p>
          ) : loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              해당 월에 등록된 지출이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/60">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground w-12 text-center">NO</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">지출일자</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">적요</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground text-right">금액</th>
                    {hasInvitedStaff && <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">구매자</th>}
                    {isOwnerOrAbove && (
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground text-center w-16">삭제</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {list.map((e, idx) => {
                    const canDelete = isOwnerOrAbove || e.profile_id === user?.id;
                    const busy = deleteLoadingId === e.id;
                    return (
                      <tr key={e.id} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="px-3 py-2 text-center text-muted-foreground tabular-nums">{idx + 1}</td>
                        <td className="px-3 py-2 tabular-nums">{e.expense_date?.slice(0, 10) ?? "—"}</td>
                        <td className="px-3 py-2">{e.description || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{formatNumber(Number(e.amount))}원</td>
                        {hasInvitedStaff && <td className="px-3 py-2 text-muted-foreground">{e.buyer_name || "—"}</td>}
                        {isOwnerOrAbove && (
                          <td className="px-3 py-2 text-center">
                            {canDelete && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={busy}
                                onClick={() => handleDelete(e.id)}
                                className="h-7 px-2 text-xs bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors active:scale-[0.97]"
                              >
                                {busy ? "…" : "삭제"}
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-border/60 bg-muted/40">
                  <tr>
                    <td className="px-3 py-2" colSpan={3}>
                      <span className="font-medium">합계</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">
                      {formatNumber(summary.total)}원
                    </td>
                    <td colSpan={isOwnerOrAbove ? 2 : 1} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-600 text-white dark:bg-green-700"
              : "bg-destructive text-destructive-foreground"
          }`}
          role="alert"
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
