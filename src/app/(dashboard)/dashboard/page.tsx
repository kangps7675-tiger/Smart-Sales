/**
 * 대시보드 메인 페이지
 *
 * 역할:
 * - 오늘의 현황 요약 (오늘 개통 건수, 예상 마진)
 * - 기간별 통계, 전월 대비 분석
 * - recharts 기반 차트 시각화 (막대/원/도넛/꺾은선)
 * - 판매일보 + CRM 데이터 자동 연동
 *
 * @file page.tsx
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/client/store/useAuthStore";
import { useReportsStore } from "@/client/store/useReportsStore";
import { SvgBarChart, SvgLineChart, SvgPieChart, SvgDonutChart } from "@/components/charts/svg-charts";

type CrmRow = {
  id: string;
  inflow_type?: string | null;
  activation_status?: string | null;
  consultation_date?: string | null;
  phone?: string | null;
  name?: string | null;
};

function parseDate(s: string): string {
  return (s ?? "").slice(0, 10);
}

function isInRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

function getAgeGroup(birthStr: string): string {
  if (!birthStr) return "";
  const cleaned = String(birthStr).replace(/[^0-9-/]/g, "").trim();
  if (!cleaned) return "";

  let yearNum = 0;

  if (cleaned.includes("-") || cleaned.includes("/")) {
    const sep = cleaned.includes("-") ? "-" : "/";
    const first = parseInt(cleaned.split(sep)[0], 10);
    if (first >= 1900 && first <= 2100) yearNum = first;
  } else {
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length === 6) {
      const yy = parseInt(digits.slice(0, 2), 10);
      yearNum = yy > 30 ? 1900 + yy : 2000 + yy;
    } else if (digits.length >= 8) {
      yearNum = parseInt(digits.slice(0, 4), 10);
    } else if (digits.length >= 4) {
      const candidate = parseInt(digits.slice(0, 4), 10);
      if (candidate >= 1900 && candidate <= 2100) yearNum = candidate;
    }
  }

  if (!yearNum || yearNum < 1900 || yearNum > 2100) return "";
  const age = new Date().getFullYear() - yearNum;
  if (age < 0 || age > 120) return "";
  const decade = Math.floor(age / 10) * 10;
  return `${decade}대`;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const registeredShops = useAuthStore((s) => s.registeredShops);
  const shops = useMemo(() => {
    if (!user) return [];
    if (user.role === "super_admin") return registeredShops;
    if (user.shopId) return registeredShops.filter((s) => s.id === user.shopId);
    return [];
  }, [user, registeredShops]);
  const userShopId = user?.shopId ?? "";
  const [selectedShopId, setSelectedShopId] = useState(userShopId);
  const isSuperAdmin = user?.role === "super_admin";
  const isBranchUser = user?.role === "tenant_admin" || user?.role === "staff";
  const canSelectShop = isSuperAdmin;
  const shopId = isBranchUser ? userShopId : (selectedShopId || userShopId || (shops[0]?.id ?? ""));

  const entries = useReportsStore((s) => s.entries);
  const loadEntries = useReportsStore((s) => s.loadEntries);

  const [salesTargetMonthly, setSalesTargetMonthly] = useState<number | null>(null);
  const [crmList, setCrmList] = useState<CrmRow[]>([]);
  const [hasInvitedStaff, setHasInvitedStaff] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === "super_admin") {
      loadEntries(null, user.role);
      return;
    }
    if (!shopId) return;
    loadEntries(shopId, user.role);
  }, [user, shopId, loadEntries]);

  useEffect(() => {
    if (canSelectShop && shops.length > 0 && !selectedShopId) setSelectedShopId(shops[0].id);
  }, [canSelectShop, shops, selectedShopId]);

  useEffect(() => {
    if (!shopId || !user) { setCrmList([]); return; }
    let cancelled = false;
    fetch(`/api/crm/consultations?shop_id=${encodeURIComponent(shopId)}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (!cancelled && Array.isArray(list)) setCrmList(list);
      })
      .catch(() => { if (!cancelled) setCrmList([]); });
    return () => { cancelled = true; };
  }, [user, shopId]);

  useEffect(() => {
    if (!shopId || !user || user.role === "staff") { setHasInvitedStaff(false); return; }
    let cancelled = false;
    fetch(`/api/shops/staff?shop_id=${encodeURIComponent(shopId)}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => { if (!cancelled) setHasInvitedStaff(Array.isArray(list) && list.length > 0); })
      .catch(() => { if (!cancelled) setHasInvitedStaff(false); });
    return () => { cancelled = true; };
  }, [shopId, user]);

  useEffect(() => {
    if (!shopId || user?.role === "staff") { setSalesTargetMonthly(null); return; }
    let cancelled = false;
    fetch(`/api/shop-settings?shop_id=${encodeURIComponent(shopId)}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setSalesTargetMonthly(data?.sales_target_monthly ?? null);
      })
      .catch(() => { if (!cancelled) setSalesTargetMonthly(null); });
    return () => { cancelled = true; };
  }, [shopId, user?.role]);

  const crmSummary = useMemo(() => {
    if (!crmList.length) return null;
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = crmList.filter((c) => (c.consultation_date ?? "").slice(0, 10) === todayStr).length;
    const pendingCount = crmList.filter((c) => c.activation_status === "△").length;
    return { todayCount, pendingCount };
  }, [crmList]);

  const staffTodoSummary = useMemo(() => {
    if (user?.role !== "staff" || !crmSummary) return null;
    return crmSummary;
  }, [user?.role, crmSummary]);

  const allShopEntries = useMemo(
    () => entries.filter((e) => e.shopId === shopId),
    [entries, shopId]
  );

  const salesPersonList = useMemo(() => {
    const set = new Set<string>();
    for (const e of allShopEntries) {
      const sp = (e.salesPerson ?? "").trim();
      if (sp) set.add(sp);
    }
    return Array.from(set).sort();
  }, [allShopEntries]);

  const [selectedSalesPerson, setSelectedSalesPerson] = useState("");

  const shopEntries = useMemo(
    () => selectedSalesPerson ? allShopEntries.filter((e) => (e.salesPerson ?? "").trim() === selectedSalesPerson) : allShopEntries,
    [allShopEntries, selectedSalesPerson]
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = useMemo(
    () => shopEntries.filter((e) => parseDate(e.saleDate) === today).length,
    [shopEntries, today]
  );
  const todayMargin = useMemo(
    () => shopEntries.filter((e) => parseDate(e.saleDate) === today).reduce((sum, e) => sum + (e.margin ?? 0), 0),
    [shopEntries, today]
  );

  type PeriodKey = "this_month" | "last_month" | "last7";
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");

  const { periodStart, periodEnd } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (periodKey === "this_month") {
      return { periodStart: `${y}-${String(m + 1).padStart(2, "0")}-01`, periodEnd: new Date(y, m + 1, 0).toISOString().slice(0, 10) };
    }
    if (periodKey === "last_month") {
      const ly = m === 0 ? y - 1 : y;
      const lm = m === 0 ? 11 : m - 1;
      return { periodStart: `${ly}-${String(lm + 1).padStart(2, "0")}-01`, periodEnd: new Date(ly, lm + 1, 0).toISOString().slice(0, 10) };
    }
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10) };
  }, [periodKey]);

  const periodStats = useMemo(() => {
    const list = shopEntries.filter((e) => { const d = parseDate(e.saleDate); return d && isInRange(d, periodStart, periodEnd); });
    return { count: list.length, margin: list.reduce((sum, e) => sum + (e.margin ?? 0), 0) };
  }, [shopEntries, periodStart, periodEnd]);

  const thisMonthRange = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return { start: `${y}-${String(m + 1).padStart(2, "0")}-01`, end: new Date(y, m + 1, 0).toISOString().slice(0, 10) };
  }, []);
  const lastMonthRange = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const ly = m === 0 ? y - 1 : y;
    const lm = m === 0 ? 11 : m - 1;
    return { start: `${ly}-${String(lm + 1).padStart(2, "0")}-01`, end: new Date(ly, lm + 1, 0).toISOString().slice(0, 10) };
  }, []);

  const thisMonthStats = useMemo(() => {
    const list = shopEntries.filter((e) => { const d = parseDate(e.saleDate); return d && isInRange(d, thisMonthRange.start, thisMonthRange.end); });
    return { count: list.length, margin: list.reduce((sum, e) => sum + (e.margin ?? 0), 0) };
  }, [shopEntries, thisMonthRange]);

  const summarySheet = useMemo(() => {
    const goal = salesTargetMonthly ?? 0;
    const actual = thisMonthStats.count;
    const remain = Math.max(0, goal - actual);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsedDays = now.getDate();
    return {
      goal, actual, remain, daysInMonth, elapsedDays,
      avgGoalPerDay: daysInMonth > 0 ? goal / daysInMonth : 0,
      avgActualPerDay: elapsedDays > 0 ? actual / elapsedDays : 0,
      hasGoal: salesTargetMonthly !== null,
    };
  }, [salesTargetMonthly, thisMonthStats.count]);

  const lastMonthStats = useMemo(() => {
    const list = shopEntries.filter((e) => { const d = parseDate(e.saleDate); return d && isInRange(d, lastMonthRange.start, lastMonthRange.end); });
    return { count: list.length, margin: list.reduce((sum, e) => sum + (e.margin ?? 0), 0) };
  }, [shopEntries, lastMonthRange]);

  const momCountChange = lastMonthStats.count ? ((thisMonthStats.count - lastMonthStats.count) / lastMonthStats.count) * 100 : (thisMonthStats.count ? 100 : 0);
  const momMarginChange = lastMonthStats.margin ? ((thisMonthStats.margin - lastMonthStats.margin) / lastMonthStats.margin) * 100 : (thisMonthStats.margin ? 100 : 0);

  /* ── 차트 데이터 ── */

  const dailyBarData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const result: { day: number; count: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthPrefix}-${String(d).padStart(2, "0")}`;
      const count = shopEntries.filter((e) => parseDate(e.saleDate) === dateStr).length;
      result.push({ day: d, count });
    }
    return result;
  }, [shopEntries]);

  const marginLineData = useMemo(() => {
    const days: { label: string; margin: number; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayEntries = shopEntries.filter((e) => parseDate(e.saleDate) === dateStr);
      days.push({
        label: dateStr.slice(5).replace("-", "/"),
        margin: dayEntries.reduce((s, e) => s + (e.margin ?? 0), 0),
        count: dayEntries.length,
      });
    }
    return days;
  }, [shopEntries]);

  const lineTypePieData = useMemo(() => {
    const thisMonthEntries = shopEntries.filter((e) => {
      const d = parseDate(e.saleDate);
      return d && isInRange(d, thisMonthRange.start, thisMonthRange.end);
    });
    const map: Record<string, number> = {};
    for (const e of thisMonthEntries) {
      const lt = (e.lineType ?? "").trim() || "미분류";
      map[lt] = (map[lt] ?? 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [shopEntries, thisMonthRange]);

  const inflowBarData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of crmList) {
      const t = (c.inflow_type ?? "").trim() || "미분류";
      map[t] = (map[t] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [crmList]);

  const ageBarData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of shopEntries) {
      const g = getAgeGroup(e.birthDate);
      if (!g) continue;
      map[g] = (map[g] ?? 0) + 1;
    }
    const order = ["10대", "20대", "30대", "40대", "50대", "60대", "70대", "80대", "90대"];
    return order.map((label) => ({ name: label, value: map[label] ?? 0 })).filter((d) => d.value > 0);
  }, [shopEntries]);

  const carrierDonutData = useMemo(() => {
    const thisMonthEntries = shopEntries.filter((e) => {
      const d = parseDate(e.saleDate);
      return d && isInRange(d, thisMonthRange.start, thisMonthRange.end);
    });
    const map: Record<string, number> = {};
    for (const e of thisMonthEntries) {
      const c = (e.existingCarrier ?? "").trim() || "미분류";
      map[c] = (map[c] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [shopEntries, thisMonthRange]);

  const activationPieData = useMemo(() => {
    const map: Record<string, number> = { "O": 0, "△": 0, "X": 0 };
    for (const c of crmList) {
      const s = c.activation_status ?? "X";
      map[s] = (map[s] ?? 0) + 1;
    }
    const labels: Record<string, string> = { "O": "개통", "△": "대기", "X": "취소" };
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: labels[key] ?? key, value }));
  }, [crmList]);

  const salesPersonSummary = useMemo(() => {
    if (!salesPersonList.length) return [];
    const thisMonthEntries = allShopEntries.filter((e) => {
      const d = parseDate(e.saleDate);
      return d && isInRange(d, thisMonthRange.start, thisMonthRange.end);
    });
    const totalMargin = thisMonthEntries.reduce((s, e) => s + (e.margin ?? 0), 0);
    const map: Record<string, { count: number; margin: number }> = {};
    for (const e of thisMonthEntries) {
      const sp = (e.salesPerson ?? "").trim() || "미지정";
      if (!map[sp]) map[sp] = { count: 0, margin: 0 };
      map[sp].count += 1;
      map[sp].margin += e.margin ?? 0;
    }
    return Object.entries(map)
      .map(([name, { count, margin }]) => ({
        name,
        count,
        margin,
        percent: totalMargin > 0 ? (margin / totalMargin) * 100 : 0,
      }))
      .sort((a, b) => b.margin - a.margin);
  }, [allShopEntries, salesPersonList, thisMonthRange]);

  const roleDashboardLabel = useMemo(() => {
    switch (user?.role) {
      case "super_admin": return { title: "전체 대시보드", description: "모든 매장 현황을 한눈에 확인하세요." };
      case "tenant_admin": return { title: "매장 대시보드", description: "오늘의 현황, 목표·실적을 확인하세요." };
      case "staff": return { title: "내 대시보드", description: "오늘의 할 일과 실적을 확인하세요." };
      default: return { title: "대시보드", description: "오늘의 현황, 기간별 통계, 전월 대비 분석을 확인하세요." };
    }
  }, [user?.role]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{roleDashboardLabel.title}</h1>
          <p className="mt-2 text-muted-foreground">{roleDashboardLabel.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          {hasInvitedStaff && salesPersonList.length > 0 && (
            <select
              value={selectedSalesPerson}
              onChange={(e) => setSelectedSalesPerson(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">전체 판매사</option>
              {salesPersonList.map((sp) => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── 요약 카드 ── */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">오늘 개통</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">{shopId ? todayCount : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">오늘 목표</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
              {shopId && summarySheet.hasGoal ? `${summarySheet.avgGoalPerDay.toFixed(1)}건` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">예상 판매마진</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums tracking-tight text-primary sm:text-5xl">
              {shopId ? `${todayMargin.toLocaleString()}원` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── 판매사별 실적 (초대된 판매사가 있을 때만 표시) ── */}
      {shopId && hasInvitedStaff && salesPersonSummary.length > 0 && !selectedSalesPerson && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle>판매사별 실적 (이번 달)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="pb-2 text-left font-medium text-muted-foreground whitespace-nowrap">판매사</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground whitespace-nowrap">건수</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground whitespace-nowrap">판매마진 합계</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground whitespace-nowrap">기여도</th>
                  </tr>
                </thead>
                <tbody>
                  {salesPersonSummary.map((row) => (
                    <tr
                      key={row.name}
                      className="border-b border-border/30 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setSelectedSalesPerson(row.name === "미지정" ? "" : row.name)}
                    >
                      <td className="py-2 font-medium whitespace-nowrap">{row.name}</td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">{row.count}건</td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">{row.margin.toLocaleString()}원</td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">{row.percent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── CRM 요약 (tenant_admin) ── */}
      {user?.role === "tenant_admin" && crmSummary && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">CRM 요약</CardTitle>
            <Link href="/dashboard/crm" className={buttonVariants({ variant: "outline", size: "sm" })}>상담 목록</Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-bold tabular-nums">{crmSummary.todayCount}건</p>
                <p className="text-xs text-muted-foreground">오늘 상담</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{crmSummary.pendingCount}건</p>
                <p className="text-xs text-muted-foreground">활성화 대기(△)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 오늘 할 일 (staff) ── */}
      {user?.role === "staff" && staffTodoSummary && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">오늘 할 일</CardTitle>
            <div className="flex gap-2">
              <Link href="/dashboard/crm" className={buttonVariants({ variant: "outline", size: "sm" })}>상담</Link>
              <Link href="/dashboard/scheduled" className={buttonVariants({ variant: "outline", size: "sm" })}>일정</Link>
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
                <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">{staffTodoSummary.pendingCount}건</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {shopId && (
        <>
          {/* ── 이번 달 요약 테이블 ── */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader><CardTitle>이번 달 요약</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="pb-2 text-left font-medium text-muted-foreground whitespace-nowrap">목표(건)</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground whitespace-nowrap">실적(건)</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground whitespace-nowrap">잔여(건)</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground whitespace-nowrap">일평균 목표</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground whitespace-nowrap">일평균 실적</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td className="py-2 tabular-nums whitespace-nowrap">{summarySheet.hasGoal ? `${summarySheet.goal}건` : "—"}</td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">{summarySheet.actual}건</td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">{summarySheet.hasGoal ? `${summarySheet.remain}건` : "—"}</td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">{summarySheet.hasGoal ? `${summarySheet.avgGoalPerDay.toFixed(1)}건` : "—"}</td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">{summarySheet.avgActualPerDay.toFixed(1)}건</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ── 일별 실적 막대그래프 ── */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader><CardTitle>일별 실적 (이번 달)</CardTitle></CardHeader>
            <CardContent>
              <SvgBarChart
                data={dailyBarData.map((d) => ({ label: String(d.day), value: d.count }))}
                height={260}
                color="#ef4444"
                unit="건"
              />
            </CardContent>
          </Card>

          {/* ── 판매마진 추이 꺾은선 그래프 ── */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader><CardTitle>최근 14일 판매마진 추이</CardTitle></CardHeader>
            <CardContent>
              <SvgLineChart
                data={marginLineData.map((d) => ({ label: d.label, value: d.margin }))}
                height={280}
                color="#14b8a6"
              />
            </CardContent>
          </Card>

          {/* ── 유무선 · 유입통계 · 연령대 ── */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border/50 shadow-sm">
              <CardHeader><CardTitle>유무선</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <SvgDonutChart data={lineTypePieData} size={200} />
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader><CardTitle>유입 통계</CardTitle></CardHeader>
              <CardContent>
                {inflowBarData.length > 0 ? (
                  <SvgBarChart
                    data={inflowBarData.map((d) => ({ label: d.name, value: d.value }))}
                    height={230}
                    color="#22c55e"
                    unit="건"
                  />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">데이터 없음</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader><CardTitle>방문자 연령 통계</CardTitle></CardHeader>
              <CardContent>
                {ageBarData.length > 0 ? (
                  <SvgBarChart
                    data={ageBarData.map((d) => ({ label: d.name, value: d.value }))}
                    height={230}
                    color="#f59e0b"
                    unit="명"
                  />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">데이터 없음</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── 통신사 분포 도넛 · 개통 상태 원그래프 ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/50 shadow-sm">
              <CardHeader><CardTitle>통신사별 분포</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <SvgDonutChart data={carrierDonutData} size={240} />
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader><CardTitle>CRM 개통 상태</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <SvgPieChart data={activationPieData} size={240} />
              </CardContent>
            </Card>
          </div>

          {/* ── 기간별 통계 ── */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
              <CardTitle>기간별 통계</CardTitle>
              <div className="flex gap-2">
                {(["this_month", "last_month", "last7"] as const).map((key) => (
                  <Button key={key} variant={periodKey === key ? "default" : "outline"} size="sm" onClick={() => setPeriodKey(key)}>
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
                  <p className="text-xs text-muted-foreground">판매마진 합계</p>
                  <p className="text-2xl font-bold tabular-nums text-primary">{periodStats.margin.toLocaleString()}원</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── 전월 대비 분석 ── */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader><CardTitle>전월 대비 분석</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="pb-2 text-left font-medium text-muted-foreground whitespace-nowrap">구분</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground whitespace-nowrap">이번 달</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground whitespace-nowrap">지난달</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground whitespace-nowrap">증감률</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td className="py-2 whitespace-nowrap">판매 건수</td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">{thisMonthStats.count}건</td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">{lastMonthStats.count}건</td>
                      <td className={`py-2 text-right tabular-nums whitespace-nowrap ${momCountChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {momCountChange >= 0 ? "+" : ""}{momCountChange.toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="py-2 whitespace-nowrap">판매마진 합계</td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">{thisMonthStats.margin.toLocaleString()}원</td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">{lastMonthStats.margin.toLocaleString()}원</td>
                      <td className={`py-2 text-right tabular-nums whitespace-nowrap ${momMarginChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {momMarginChange >= 0 ? "+" : ""}{momMarginChange.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── 빠른 작업 ── */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle>빠른 작업</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="pt-1">
              <Link href="/dashboard/contract/new">
                <Button className="w-full sm:w-auto" size="lg">새 계약·상담 등록</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle>오늘의 판매 일보</CardTitle></CardHeader>
          <CardContent className="space-y-5">
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
