/**
 * 대시보드 메인 페이지
 *
 * 역할:
 * - 오늘의 현황 요약 (오늘 개통 건수, 예상 마진)
 * - 기간별 통계, 전월 대비 분석, 차트 시각화
 * - 빠른 작업 링크
 *
 * @file page.tsx
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/client/store/useAuthStore";
import { useReportsStore } from "@/client/store/useReportsStore";

function parseDate(s: string): string {
  return (s ?? "").slice(0, 10);
}

function isInRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);
  const shops = getShopsForCurrentUser();
  const userShopId = user?.shopId ?? "";
  const [selectedShopId, setSelectedShopId] = useState(userShopId);
  const isSuperAdmin = user?.role === "super_admin";
  const isRegionManager = user?.role === "region_manager";
  const isBranchUser = user?.role === "tenant_admin" || user?.role === "staff";
  const canSelectShop = isSuperAdmin || isRegionManager;
  const shopId = isBranchUser ? userShopId : (selectedShopId || userShopId || (shops[0]?.id ?? ""));

  const entries = useReportsStore((s) => s.entries);
  const loadEntries = useReportsStore((s) => s.loadEntries);

  /** 매장 설정(월 목표 건수) — 요약 시트용 */
  const [salesTargetMonthly, setSalesTargetMonthly] = useState<number | null>(null);

  /** super_admin 전용: 지점 목록 (지점 요약용) */
  const [storeGroups, setStoreGroups] = useState<{ id: string; name: string }[]>([]);

  /** tenant_admin / staff: CRM 상담 요약 (오늘 건수, △ 대기 건수) */
  const [crmSummary, setCrmSummary] = useState<{ todayCount: number; pendingCount: number } | null>(null);

  /** 판매일보 로드: super_admin/region_manager는 전체·지점 전체, 그 외는 선택 매장만 */
  useEffect(() => {
    if (!user) return;
    if (user.role === "super_admin" || user.role === "region_manager") {
      loadEntries(null, user.role);
      return;
    }
    if (!shopId) return;
    loadEntries(shopId, user.role);
  }, [user, shopId, loadEntries]);

  /** super_admin일 때 지점 목록 로드 */
  useEffect(() => {
    if (user?.role !== "super_admin") return;
    let cancelled = false;
    fetch("/api/store-groups", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (!cancelled && Array.isArray(list)) setStoreGroups(list);
      })
      .catch(() => {
        if (!cancelled) setStoreGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  useEffect(() => {
    if (canSelectShop && shops.length > 0 && !selectedShopId) setSelectedShopId(shops[0].id);
  }, [canSelectShop, shops, selectedShopId]);

  /** tenant_admin / staff: CRM 상담 요약 로드 (오늘 건수, △ 대기) */
  useEffect(() => {
    if ((user?.role !== "tenant_admin" && user?.role !== "staff") || !shopId) {
      setCrmSummary(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/crm/consultations?shop_id=${encodeURIComponent(shopId)}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (cancelled || !Array.isArray(list)) return;
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayCount = list.filter(
          (c: { consultation_date?: string }) => (c.consultation_date ?? "").slice(0, 10) === todayStr
        ).length;
        const pendingCount = list.filter(
          (c: { activation_status?: string }) => c.activation_status === "△"
        ).length;
        setCrmSummary({ todayCount, pendingCount });
      })
      .catch(() => {
        if (!cancelled) setCrmSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role, shopId]);

  /** staff 전용: 오늘 할 일 — CRM 오늘 상담 + △ 대기 (리스트는 CRM/일정 페이지에서) */
  const staffTodoSummary = useMemo(() => {
    if (user?.role !== "staff" || crmSummary === null) return null;
    return crmSummary;
  }, [user?.role, crmSummary]);

  /** 선택된 매장의 shop_settings 로드 (판매사는 API 403이므로 호출 생략) */
  useEffect(() => {
    if (!shopId || user?.role === "staff") {
      setSalesTargetMonthly(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/shop-settings?shop_id=${encodeURIComponent(shopId)}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data !== null && typeof data.sales_target_monthly === "number") {
          setSalesTargetMonthly(data.sales_target_monthly);
        } else {
          setSalesTargetMonthly(null);
        }
      })
      .catch(() => {
        if (!cancelled) setSalesTargetMonthly(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shopId, user?.role]);

  const shopEntries = useMemo(
    () => entries.filter((e) => e.shopId === shopId),
    [entries, shopId]
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = useMemo(
    () => shopEntries.filter((e) => parseDate(e.saleDate) === today).length,
    [shopEntries, today]
  );
  const todayMargin = useMemo(
    () =>
      shopEntries
        .filter((e) => parseDate(e.saleDate) === today)
        .reduce((sum, e) => sum + (e.margin ?? 0), 0),
    [shopEntries, today]
  );

  /** 기간 옵션: 이번 달, 지난달, 최근 7일 */
  type PeriodKey = "this_month" | "last_month" | "last7";
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");

  const { periodStart, periodEnd } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (periodKey === "this_month") {
      return {
        periodStart: `${y}-${String(m + 1).padStart(2, "0")}-01`,
        periodEnd: new Date(y, m + 1, 0).toISOString().slice(0, 10),
      };
    }
    if (periodKey === "last_month") {
      const ly = m === 0 ? y - 1 : y;
      const lm = m === 0 ? 11 : m - 1;
      return {
        periodStart: `${ly}-${String(lm + 1).padStart(2, "0")}-01`,
        periodEnd: new Date(ly, lm + 1, 0).toISOString().slice(0, 10),
      };
    }
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return {
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: end.toISOString().slice(0, 10),
    };
  }, [periodKey]);

  const periodStats = useMemo(() => {
    const list = shopEntries.filter((e) => {
      const d = parseDate(e.saleDate);
      return d && isInRange(d, periodStart, periodEnd);
    });
    const count = list.length;
    const margin = list.reduce((sum, e) => sum + (e.margin ?? 0), 0);
    return { count, margin };
  }, [shopEntries, periodStart, periodEnd]);

  /** 전월 대비: 이번 달 vs 지난달 */
  const thisMonthRange = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return {
      start: `${y}-${String(m + 1).padStart(2, "0")}-01`,
      end: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    };
  }, []);
  const lastMonthRange = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const ly = m === 0 ? y - 1 : y;
    const lm = m === 0 ? 11 : m - 1;
    return {
      start: `${ly}-${String(lm + 1).padStart(2, "0")}-01`,
      end: new Date(ly, lm + 1, 0).toISOString().slice(0, 10),
    };
  }, []);

  const thisMonthStats = useMemo(() => {
    const list = shopEntries.filter((e) => {
      const d = parseDate(e.saleDate);
      return d && isInRange(d, thisMonthRange.start, thisMonthRange.end);
    });
    return {
      count: list.length,
      margin: list.reduce((sum, e) => sum + (e.margin ?? 0), 0),
    };
  }, [shopEntries, thisMonthRange]);

  /** 요약 시트: 목표/실적/잔여/일평균 목표·일평균 실적 */
  const summarySheet = useMemo(() => {
    const goal = salesTargetMonthly ?? 0;
    const actual = thisMonthStats.count;
    const remain = Math.max(0, goal - actual);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const elapsedDays = now.getDate();
    const avgGoalPerDay = daysInMonth > 0 ? goal / daysInMonth : 0;
    const avgActualPerDay = elapsedDays > 0 ? actual / elapsedDays : 0;
    return {
      goal,
      actual,
      remain,
      daysInMonth,
      elapsedDays,
      avgGoalPerDay,
      avgActualPerDay,
      hasGoal: salesTargetMonthly !== null,
    };
  }, [salesTargetMonthly, thisMonthStats.count]);

  const lastMonthStats = useMemo(() => {
    const list = shopEntries.filter((e) => {
      const d = parseDate(e.saleDate);
      return d && isInRange(d, lastMonthRange.start, lastMonthRange.end);
    });
    return {
      count: list.length,
      margin: list.reduce((sum, e) => sum + (e.margin ?? 0), 0),
    };
  }, [shopEntries, lastMonthRange]);

  const momCountChange = lastMonthStats.count
    ? ((thisMonthStats.count - lastMonthStats.count) / lastMonthStats.count) * 100
    : (thisMonthStats.count ? 100 : 0);
  const momMarginChange = lastMonthStats.margin
    ? ((thisMonthStats.margin - lastMonthStats.margin) / lastMonthStats.margin) * 100
    : (thisMonthStats.margin ? 100 : 0);

  /** 차트: 최근 14일 일별 건수·마진 */
  const chartDays = useMemo(() => {
    const days: { date: string; count: number; margin: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = shopEntries.filter((e) => parseDate(e.saleDate) === dateStr).length;
      const margin = shopEntries
        .filter((e) => parseDate(e.saleDate) === dateStr)
        .reduce((s, e) => s + (e.margin ?? 0), 0);
      days.push({ date: dateStr, count, margin });
    }
    return days;
  }, [shopEntries]);

  const maxCount = Math.max(1, ...chartDays.map((d) => d.count));
  const maxMargin = Math.max(1, ...chartDays.map((d) => d.margin));

  /** 역할별 대시보드 제목·설명 */
  const roleDashboardLabel = useMemo(() => {
    switch (user?.role) {
      case "super_admin":
        return {
          title: "전체 대시보드",
          description: "모든 지점·매장 현황을 한눈에 확인하세요.",
        };
      case "region_manager":
        return {
          title: "지점 대시보드",
          description: "담당 지점 내 매장 현황을 확인하세요.",
        };
      case "tenant_admin":
        return {
          title: "매장 대시보드",
          description: "오늘의 현황, 목표·실적을 확인하세요.",
        };
      case "staff":
        return {
          title: "내 대시보드",
          description: "오늘의 할 일과 실적을 확인하세요.",
        };
      default:
        return {
          title: "대시보드",
          description: "오늘의 현황, 기간별 통계, 전월 대비 분석을 확인하세요.",
        };
    }
  }, [user?.role]);

  /** super_admin 전용: 지점별 오늘 건수·마진 요약 */
  const groupSummaryList = useMemo(() => {
    if (user?.role !== "super_admin" || !storeGroups.length || !shops.length) return [];
    const todayStr = new Date().toISOString().slice(0, 10);
    return storeGroups.map((g) => {
      const shopIds = shops.filter((s) => s.storeGroupId === g.id).map((s) => s.id);
      const todayEntries = entries.filter(
        (e) => shopIds.includes(e.shopId) && parseDate(e.saleDate) === todayStr
      );
      const todayCount = todayEntries.length;
      const todayMargin = todayEntries.reduce((sum, e) => sum + (e.margin ?? 0), 0);
      return {
        id: g.id,
        name: g.name,
        shopCount: shopIds.length,
        todayCount,
        todayMargin,
      };
    });
  }, [user?.role, storeGroups, shops, entries]);

  /** region_manager 전용: 지점 내 매장별 오늘 건수·마진 랭킹 (건수 내림차순) */
  const branchShopRanking = useMemo(() => {
    if (user?.role !== "region_manager" || !shops.length) return [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const list = shops.map((s) => {
      const todayEntries = entries.filter(
        (e) => e.shopId === s.id && parseDate(e.saleDate) === todayStr
      );
      return {
        shopId: s.id,
        shopName: s.name,
        todayCount: todayEntries.length,
        todayMargin: todayEntries.reduce((sum, e) => sum + (e.margin ?? 0), 0),
      };
    });
    return [...list].sort((a, b) => b.todayCount - a.todayCount);
  }, [user?.role, shops, entries]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{roleDashboardLabel.title}</h1>
          <p className="mt-2 text-muted-foreground">{roleDashboardLabel.description}</p>
        </div>
        {(isSuperAdmin || isRegionManager) && shops.length > 1 && (
          <select
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">오늘 개통</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
              {shopId ? todayCount : "—"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {shopId ? "판매일보 기준" : "매장을 선택하세요"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">오늘 목표</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
              {shopId && summarySheet.hasGoal
                ? `${summarySheet.avgGoalPerDay.toFixed(1)}건`
                : "—"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {shopId
                ? summarySheet.hasGoal
                  ? "일 평균 목표 (월 목표 ÷ 해당 월 일수)"
                  : "매장 설정에서 월 목표를 입력하세요"
                : "매장을 선택하세요"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">예상 마진</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums tracking-tight text-primary sm:text-5xl">
              {shopId ? `${todayMargin.toLocaleString()}원` : "—"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">금일 판매일보 기준</p>
          </CardContent>
        </Card>
      </div>

      {isSuperAdmin && groupSummaryList.length > 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>지점별 요약</CardTitle>
            <CardDescription>오늘 기준 지점별 매장 수, 개통 건수, 예상 마진입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="pb-2 text-left font-medium text-muted-foreground">지점</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">매장 수</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">오늘 개통</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">오늘 마진</th>
                  </tr>
                </thead>
                <tbody>
                  {groupSummaryList.map((row) => (
                    <tr key={row.id} className="border-b border-border/30">
                      <td className="py-2 font-medium">{row.name}</td>
                      <td className="py-2 text-right tabular-nums">{row.shopCount}곳</td>
                      <td className="py-2 text-right tabular-nums">{row.todayCount}건</td>
                      <td className="py-2 text-right tabular-nums">{row.todayMargin.toLocaleString()}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {isRegionManager && branchShopRanking.length > 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>지점 내 매장 랭킹</CardTitle>
            <CardDescription>오늘 개통 건수 기준 담당 지점 내 매장 순위입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="pb-2 text-left font-medium text-muted-foreground">순위</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">매장</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">오늘 개통</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">오늘 마진</th>
                  </tr>
                </thead>
                <tbody>
                  {branchShopRanking.map((row, idx) => (
                    <tr key={row.shopId} className="border-b border-border/30">
                      <td className="py-2 tabular-nums">{idx + 1}</td>
                      <td className="py-2 font-medium">{row.shopName}</td>
                      <td className="py-2 text-right tabular-nums">{row.todayCount}건</td>
                      <td className="py-2 text-right tabular-nums">{row.todayMargin.toLocaleString()}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role === "tenant_admin" && crmSummary !== null && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">CRM 요약</CardTitle>
              <CardDescription>오늘 상담·활성화 대기 현황입니다.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/crm">상담 목록</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-bold tabular-nums">{crmSummary.todayCount}건</p>
                <p className="text-xs text-muted-foreground">오늘 상담</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {crmSummary.pendingCount}건
                </p>
                <p className="text-xs text-muted-foreground">활성화 대기(△)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role === "staff" && staffTodoSummary !== null && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">오늘 할 일</CardTitle>
              <CardDescription>오늘 상담·활성화 대기 건수입니다. 상세는 상담/일정에서 확인하세요.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/crm">상담</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/scheduled">일정</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                <span className="text-muted-foreground">오늘 상담</span>
                <span className="font-semibold tabular-nums">{staffTodoSummary.todayCount}건</span>
              </li>
              <li className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <span className="text-muted-foreground">활성화 대기(△)</span>
                <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {staffTodoSummary.pendingCount}건
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {shopId && (
        <>
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>이번 달 요약</CardTitle>
              <CardDescription>
                목표 대비 실적, 잔여, 일평균 목표·실적입니다. 월 목표는 매장 설정에서 입력합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="pb-2 text-left font-medium text-muted-foreground">목표(건)</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">실적(건)</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">잔여(건)</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">일평균 목표</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">일평균 실적</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td className="py-2 tabular-nums">
                        {summarySheet.hasGoal ? `${summarySheet.goal}건` : "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums">{summarySheet.actual}건</td>
                      <td className="py-2 text-right tabular-nums">
                        {summarySheet.hasGoal ? `${summarySheet.remain}건` : "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {summarySheet.hasGoal
                          ? `${summarySheet.avgGoalPerDay.toFixed(1)}건`
                          : "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {summarySheet.avgActualPerDay.toFixed(1)}건
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date().getFullYear()}년 {new Date().getMonth() + 1}월 기준 · 경과 {summarySheet.elapsedDays}일 / {summarySheet.daysInMonth}일
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>기간별 통계</CardTitle>
                <CardDescription>선택한 기간의 판매 건수와 마진 합계입니다.</CardDescription>
              </div>
              <div className="flex gap-2">
                {(["this_month", "last_month", "last7"] as const).map((key) => (
                  <Button
                    key={key}
                    variant={periodKey === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPeriodKey(key)}
                  >
                    {key === "this_month" ? "이번 달" : key === "last_month" ? "지난달" : "최근 7일"}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">판매 건수</p>
                  <p className="text-2xl font-bold tabular-nums">{periodStats.count}건</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">마진 합계</p>
                  <p className="text-2xl font-bold tabular-nums text-primary">
                    {periodStats.margin.toLocaleString()}원
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {periodStart} ~ {periodEnd}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>전월 대비 분석</CardTitle>
              <CardDescription>이번 달과 지난달 판매 건수·마진을 비교합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="pb-2 text-left font-medium text-muted-foreground">구분</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">이번 달</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">지난달</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">증감률</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td className="py-2">판매 건수</td>
                      <td className="py-2 text-right tabular-nums">{thisMonthStats.count}건</td>
                      <td className="py-2 text-right tabular-nums">{lastMonthStats.count}건</td>
                      <td className={`py-2 text-right tabular-nums ${momCountChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {momCountChange >= 0 ? "+" : ""}{momCountChange.toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="py-2">마진 합계</td>
                      <td className="py-2 text-right tabular-nums">{thisMonthStats.margin.toLocaleString()}원</td>
                      <td className="py-2 text-right tabular-nums">{lastMonthStats.margin.toLocaleString()}원</td>
                      <td className={`py-2 text-right tabular-nums ${momMarginChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {momMarginChange >= 0 ? "+" : ""}{momMarginChange.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>차트 시각화</CardTitle>
              <CardDescription>최근 14일 일별 판매 건수와 마진입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">일별 판매 건수</p>
                <div className="flex items-end gap-1 rounded-md bg-muted/40 p-3" style={{ minHeight: 120 }}>
                  {chartDays.map((d) => (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full min-w-0 rounded-t bg-primary/80 transition-all"
                        style={{ height: `${(d.count / maxCount) * 80}px`, minHeight: d.count ? 4 : 0 }}
                        title={`${d.date}: ${d.count}건`}
                      />
                      <span className="truncate text-[10px] text-muted-foreground">
                        {d.date.slice(5).replace("-", "/")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">일별 마진</p>
                <div className="flex items-end gap-1 rounded-md bg-muted/40 p-3" style={{ minHeight: 120 }}>
                  {chartDays.map((d) => (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full min-w-0 rounded-t bg-teal-500/80 dark:bg-teal-600/80 transition-all"
                        style={{ height: `${(d.margin / maxMargin) * 80}px`, minHeight: d.margin ? 4 : 0 }}
                        title={`${d.date}: ${d.margin.toLocaleString()}원`}
                      />
                      <span className="truncate text-[10px] text-muted-foreground">
                        {d.date.slice(5).replace("-", "/")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
            <CardDescription>자주 쓰는 메뉴로 바로 이동합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              단계별 질문으로 20개 항목을 줄여주는 스마트 견적기로 바로 갑니다.
            </p>
            <div className="pt-1">
              <Link href="/dashboard/contract/new">
                <Button className="w-full sm:w-auto" size="lg">
                  새 계약·상담 등록
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>오늘의 판매 일보</CardTitle>
            <CardDescription>엑셀 업로드로 불러온 고객 데이터가 여기와 대시보드에 반영됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              판매일보 페이지에서 엑셀을 업로드하면 추출된 고객 데이터가 대시보드 요약에 반영됩니다.
            </p>
            <div className="pt-1">
              <Link href="/dashboard/reports">
                <Button variant="outline" size="sm">판매 일보로 이동</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
