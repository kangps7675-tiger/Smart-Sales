"use client";

/**
 * 월별 요약 페이지
 * 목표/실적/잔여/일평균 (판매일보 데이터 기반)
 */

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/client/store/useAuthStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ReportEntryLike = { sale_date?: string; saleDate?: string };
type StatsRow = { label: string; total: number; percent: number };
type StatsPayload = {
  inflow: { rows: StatsRow[]; totalRow: { total: number } };
  activation: { rows: StatsRow[]; totalRow: { total: number } };
};

export default function SummaryPage() {
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);
  const shops = typeof getShopsForCurrentUser === "function" ? getShopsForCurrentUser() : [];
  const userShopId = user?.shopId ?? "";

  const isSuperAdmin = user?.role === "super_admin";
  const isBranchUser = user?.role === "tenant_admin" || user?.role === "staff";
  const canSelectShop = isSuperAdmin;
  const [selectedShopId, setSelectedShopId] = useState((userShopId || shops[0]?.id) ?? "");
  const shopId = isBranchUser ? userShopId : ((selectedShopId || userShopId || shops[0]?.id) ?? "");

  const [summaryMonth, setSummaryMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [salesTargetMonthly, setSalesTargetMonthly] = useState<number | null>(null);
  const [reportEntries, setReportEntries] = useState<ReportEntryLike[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState<StatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (canSelectShop && shops.length > 0 && !selectedShopId) setSelectedShopId(shops[0].id);
  }, [canSelectShop, shops, selectedShopId]);

  useEffect(() => {
    if (!shopId) {
      setSalesTargetMonthly(null);
      setReportEntries([]);
      return;
    }
    const monthStr = /^\d{4}-\d{2}$/.test(summaryMonth) ? summaryMonth : new Date().toISOString().slice(0, 7);
    const [y, m] = monthStr.split("-").map(Number);
    if (!m || m < 1 || m > 12) return;
    setLoading(true);
    const monthStart = `${monthStr}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${monthStr}-${String(lastDay).padStart(2, "0")}`;

    Promise.all([
      fetch(`/api/shop-settings?shop_id=${encodeURIComponent(shopId)}`, { credentials: "include" }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(`/api/reports?shop_id=${encodeURIComponent(shopId)}`, { credentials: "include" }).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([settings, reports]) => {
        setSalesTargetMonthly(settings?.sales_target_monthly ?? null);
        const list = Array.isArray(reports) ? reports : [];
        setReportEntries(
          list.filter((e: ReportEntryLike) => {
            const d = (e.sale_date ?? e.saleDate ?? "").slice(0, 10);
            return d >= monthStart && d <= monthEnd;
          })
        );
      })
      .catch(() => {
        setSalesTargetMonthly(null);
        setReportEntries([]);
      })
      .finally(() => setLoading(false));
  }, [shopId, summaryMonth]);

  useEffect(() => {
    if (!shopId) {
      setStatsData(null);
      return;
    }
    setStatsLoading(true);
    const monthStr = /^\d{4}-\d{2}$/.test(summaryMonth) ? summaryMonth : new Date().toISOString().slice(0, 7);
    fetch(
      `/api/stats/inflow-activation?shop_id=${encodeURIComponent(shopId)}&month=${encodeURIComponent(monthStr)}`,
      { credentials: "include" }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.inflow && data?.activation) setStatsData(data);
        else setStatsData(null);
      })
      .catch(() => setStatsData(null))
      .finally(() => setStatsLoading(false));
  }, [shopId, summaryMonth]);

  const summary = useMemo(() => {
    const monthStr = /^\d{4}-\d{2}$/.test(summaryMonth) ? summaryMonth : new Date().toISOString().slice(0, 7);
    const [y, m] = monthStr.split("-").map(Number);
    if (!m || m < 1 || m > 12) return { goal: 0, actual: 0, remain: 0, daysInMonth: 30, elapsedDays: 0, avgGoalPerDay: 0, avgActualPerDay: 0, hasGoal: false };
    const daysInMonth = new Date(y, m, 0).getDate();
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
    const elapsedDays = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

    const goal = salesTargetMonthly ?? 0;
    const actual = reportEntries.length;
    const remain = Math.max(0, goal - actual);
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
      hasGoal: goal > 0,
    };
  }, [summaryMonth, salesTargetMonthly, reportEntries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">월별 요약</h1>
          <p className="mt-2 text-muted-foreground">
            목표 대비 실적, 잔여, 일평균 목표·실적입니다. 월 목표는 매장 설정에서 입력합니다.
          </p>
        </div>
        {canSelectShop && shops.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">매장 선택</label>
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

      {!shopId ? (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">매장을 선택하거나 소속 매장이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">목표 / 실적 / 잔여 / 일평균</CardTitle>
              <CardDescription>
                선택한 월의 판매일보 실적 기준입니다.
              </CardDescription>
            </div>
            <Input
              type="month"
              value={summaryMonth}
              onChange={(e) => setSummaryMonth(e.target.value)}
              className="w-40"
            />
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">불러오는 중…</p>
            ) : (
              <>
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
                          {summary.hasGoal ? `${summary.goal}건` : "—"}
                        </td>
                        <td className="py-2 text-right tabular-nums">{summary.actual}건</td>
                        <td className="py-2 text-right tabular-nums">
                          {summary.hasGoal ? `${summary.remain}건` : "—"}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {summary.hasGoal ? `${summary.avgGoalPerDay.toFixed(1)}건` : "—"}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {summary.avgActualPerDay.toFixed(1)}건
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {/^\d{4}-\d{2}$/.test(summaryMonth) ? `${summaryMonth.slice(0, 4)}년 ${summaryMonth.slice(5, 7)}월` : summaryMonth || "—"} 기준 · 경과 {summary.elapsedDays}일 / {summary.daysInMonth}일
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {shopId && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">유입·개통 통계</CardTitle>
            <CardDescription>
              선택 월의 상담 유입·개통(판매일보) 건수입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <p className="text-sm text-muted-foreground">불러오는 중…</p>
            ) : statsData ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="pb-2 text-left font-medium text-muted-foreground">유입</th>
                        <th className="pb-2 text-right font-medium text-muted-foreground">건수</th>
                        <th className="pb-2 text-right font-medium text-muted-foreground">비율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.inflow.rows.map((r) => (
                        <tr key={r.label} className="border-b border-border/30">
                          <td className="py-2">{r.label}</td>
                          <td className="py-2 text-right tabular-nums">{r.total}</td>
                          <td className="py-2 text-right tabular-nums">{r.percent}%</td>
                        </tr>
                      ))}
                      <tr className="border-b border-border/30 font-medium">
                        <td className="py-2">합계</td>
                        <td className="py-2 text-right tabular-nums">{statsData.inflow.totalRow.total}</td>
                        <td className="py-2 text-right tabular-nums">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="pb-2 text-left font-medium text-muted-foreground">개통</th>
                        <th className="pb-2 text-right font-medium text-muted-foreground">건수</th>
                        <th className="pb-2 text-right font-medium text-muted-foreground">비율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.activation.rows.map((r) => (
                        <tr key={r.label} className="border-b border-border/30">
                          <td className="py-2">{r.label}</td>
                          <td className="py-2 text-right tabular-nums">{r.total}</td>
                          <td className="py-2 text-right tabular-nums">{r.percent}%</td>
                        </tr>
                      ))}
                      <tr className="border-b border-border/30 font-medium">
                        <td className="py-2">합계</td>
                        <td className="py-2 text-right tabular-nums">{statsData.activation.totalRow.total}</td>
                        <td className="py-2 text-right tabular-nums">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
