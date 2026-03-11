"use client";

/**
 * 예정건 전용 페이지
 * - 개통여부 △(예정건)인 상담만 목록
 * - 개통(O) → 판매일보 이동, 취소(X) → CRM으로 복귀, 삭제
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/client/store/useAuthStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);
  const shops = getShopsForCurrentUser();
  const userShopId = user?.shopId ?? "";

  const [list, setList] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState((userShopId || shops[0]?.id) ?? "");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasInvitedStaff, setHasInvitedStaff] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";
  const isBranchUser = user?.role === "tenant_admin" || user?.role === "staff";
  const canSelectShop = isSuperAdmin;
  const shopId = isBranchUser ? userShopId : ((selectedShopId || userShopId || shops[0]?.id) ?? "");

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

  useEffect(() => {
    if (!shopId || (user?.role !== "tenant_admin" && user?.role !== "super_admin")) return;
    fetch(`/api/shops/staff?shop_id=${shopId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((list: unknown[]) => setHasInvitedStaff(list.length > 0))
      .catch(() => setHasInvitedStaff(false));
  }, [shopId, user?.role]);

  const handleActivate = useCallback(async (id: string) => {
    if (actionLoadingId) return;
    setActionLoadingId(id);
    try {
      const statusRes = await fetch(`/api/crm/consultations/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activation_status: "O" }),
      });
      if (!statusRes.ok) {
        showToast("error", "상태 변경에 실패했습니다.");
        return;
      }

      const moveRes = await fetch(`/api/crm/consultations/${id}/move-to-report`, {
        method: "POST",
        credentials: "include",
      });
      if (!moveRes.ok) {
        const json = await moveRes.json().catch(() => ({}));
        showToast("error", (json as Record<string, string>)?.error ?? "판매일보 이동에 실패했습니다.");
        return;
      }

      setList((prev) => prev.filter((c) => c.id !== id));
      showToast("success", "개통 처리 완료! 판매일보로 이동합니다.");
      setTimeout(() => router.push("/dashboard/reports"), 800);
    } catch {
      showToast("error", "처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoadingId(null);
    }
  }, [actionLoadingId, showToast, router]);

  const handleCancel = useCallback(async (id: string) => {
    if (actionLoadingId) return;
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/crm/consultations/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activation_status: "X" }),
      });
      if (!res.ok) {
        showToast("error", "상태 변경에 실패했습니다.");
        return;
      }
      setList((prev) => prev.filter((c) => c.id !== id));
      showToast("success", "취소 처리 완료. 상담(CRM)에서 확인하세요.");
    } catch {
      showToast("error", "처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoadingId(null);
    }
  }, [actionLoadingId, showToast]);

  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});
  const [memoSavingId, setMemoSavingId] = useState<string | null>(null);
  const [memoEditingId, setMemoEditingId] = useState<string | null>(null);

  useEffect(() => {
    const drafts: Record<string, string> = {};
    for (const c of list) {
      drafts[c.id] = [c.product_name, c.memo].filter(Boolean).join(" / ");
    }
    setMemoDrafts(drafts);
  }, [list]);

  const handleSaveMemo = useCallback(async (id: string) => {
    if (memoSavingId) return;
    const text = (memoDrafts[id] ?? "").trim();
    setMemoSavingId(id);
    try {
      const res = await fetch(`/api/crm/consultations/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo: text }),
      });
      if (!res.ok) {
        showToast("error", "메모 저장에 실패했습니다.");
        return;
      }
      setList((prev) => prev.map((c) => c.id === id ? { ...c, memo: text, product_name: null } : c));
      setMemoEditingId(null);
      showToast("success", "메모가 저장되었습니다.");
    } catch {
      showToast("error", "메모 저장 중 오류가 발생했습니다.");
    } finally {
      setMemoSavingId(null);
    }
  }, [memoSavingId, memoDrafts, showToast]);

  const handleDelete = useCallback(async (id: string) => {
    if (actionLoadingId) return;
    if (typeof window !== "undefined" && !window.confirm("이 예정건을 삭제할까요?")) return;
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/crm/consultations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        showToast("error", "삭제에 실패했습니다.");
        return;
      }
      setList((prev) => prev.filter((c) => c.id !== id));
      showToast("success", "삭제되었습니다.");
    } catch {
      showToast("error", "삭제 중 오류가 발생했습니다.");
    } finally {
      setActionLoadingId(null);
    }
  }, [actionLoadingId, showToast]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">예정건</h1>
          <p className="mt-2 text-muted-foreground">
            개통여부 △(예정건)으로 등록된 상담만 모아봅니다. 개통 시 판매일보로, 취소 시 CRM으로 돌아갑니다.
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
          <Link href="/dashboard/crm">
            <Button variant="outline" size="sm">상담(CRM)으로 이동</Button>
          </Link>
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
                    <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">고객명</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">연락처</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">상담일</th>
                    {hasInvitedStaff && <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">담당</th>}
                    <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">상품/메모</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground text-center">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => {
                    const busy = actionLoadingId === c.id;
                    return (
                      <tr key={c.id} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="px-3 py-2">{c.name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{c.phone ?? "—"}</td>
                        <td className="px-3 py-2 tabular-nums">{c.consultation_date?.slice(0, 10) ?? "—"}</td>
                        {hasInvitedStaff && <td className="px-3 py-2 text-muted-foreground">{c.sales_person ?? "—"}</td>}
                        <td className="px-3 py-1.5">
                          {memoEditingId === c.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                className="h-7 min-w-[10rem] text-sm"
                                value={memoDrafts[c.id] ?? ""}
                                onChange={(e) => setMemoDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveMemo(c.id);
                                  if (e.key === "Escape") setMemoEditingId(null);
                                }}
                                placeholder="상품명 / 메모"
                                autoFocus
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={memoSavingId === c.id}
                                onClick={() => handleSaveMemo(c.id)}
                                className="h-7 px-2 text-xs shrink-0 transition-all hover:bg-primary/10 active:scale-[0.97]"
                              >
                                {memoSavingId === c.id ? "…" : "저장"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setMemoEditingId(null);
                                  setMemoDrafts((prev) => ({
                                    ...prev,
                                    [c.id]: [c.product_name, c.memo].filter(Boolean).join(" / "),
                                  }));
                                }}
                                className="h-7 px-2 text-xs shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                취소
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">
                                {[c.product_name, c.memo].filter(Boolean).join(" / ") || "—"}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setMemoEditingId(c.id)}
                                className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              >
                                수정
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy}
                              onClick={() => handleActivate(c.id)}
                              className="h-7 px-2.5 text-xs transition-all hover:brightness-110 hover:shadow-sm active:scale-[0.97]"
                            >
                              {busy ? "…" : "개통"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleCancel(c.id)}
                              className="h-7 px-2.5 text-xs transition-all hover:bg-muted active:scale-[0.97]"
                            >
                              취소
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy}
                              onClick={() => handleDelete(c.id)}
                              className="h-7 px-2 text-xs bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors active:scale-[0.97]"
                            >
                              삭제
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
