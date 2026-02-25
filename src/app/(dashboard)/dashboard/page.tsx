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
  const isBranchUser = user?.role === "tenant_admin" || user?.role === "staff";
  const shopId = isBranchUser ? userShopId : (selectedShopId || userShopId || (shops[0]?.id ?? ""));

  const entries = useReportsStore((s) => s.entries);
  const loadEntries = useReportsStore((s) => s.loadEntries);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "super_admin" && !shopId) return;
    loadEntries(shopId || null, user.role);
  }, [user, shopId, loadEntries]);

  useEffect(() => {
    if (isSuperAdmin && shops.length > 0 && !selectedShopId) setSelectedShopId(shops[0].id);
  }, [isSuperAdmin, shops, selectedShopId]);

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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">대시보드</h1>
          <p className="mt-2 text-muted-foreground">오늘의 현황, 기간별 통계, 전월 대비 분석을 확인하세요.</p>
        </div>
        {isSuperAdmin && shops.length > 1 && (
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
            <p className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">—</p>
            <p className="mt-2 text-xs text-muted-foreground">설정 후 표시</p>
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

      {shopId && (
        <>
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
