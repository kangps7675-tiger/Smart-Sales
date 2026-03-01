"use client";

/**
 * 상담(CRM) 페이지
 * - 상단: 월별 요약(목표/실적/잔여/일평균) + 그래프 (판매일보 업로드 데이터 기반)
 * - 상담 로우 등록·목록·개통여부(O/△/X) 관리
 * - O → 판매일보 이동 버튼
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/client/store/useAuthStore";
import type { Consultation, CrmFormState, CrmSummarySheet, ReportEntry, StatsPayload } from "./crm-types";
import { INFLOW_OPTIONS, type InflowType } from "./crm-types";
import { CrmPageView } from "./crm-page-view";

export default function CrmPage() {
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);
  const shops = getShopsForCurrentUser();
  const userShopId = user?.shopId ?? "";

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState((userShopId || shops[0]?.id) ?? "");
  const [filterStatus, setFilterStatus] = useState<string>("");

  /** CRM 상단 요약: 선택 월 (판매일보 데이터 기반) */
  const [summaryMonth, setSummaryMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [salesTargetMonthly, setSalesTargetMonthly] = useState<number | null>(null);
  const [reportEntries, setReportEntries] = useState<ReportEntry[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  /** 유입/개통 통계 (일별·계·%) */
  const [statsData, setStatsData] = useState<StatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

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
      const q = new URLSearchParams({ shop_id: shopId });
      if (filterStatus) q.set("activation_status", filterStatus);
      const res = await fetch(`/api/crm/consultations?${q}`);
      if (!res.ok) throw new Error("목록을 불러올 수 없습니다.");
      const data = await res.json();
      setConsultations(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  }, [shopId, filterStatus]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (canSelectShop && shops.length > 0 && !selectedShopId) setSelectedShopId(shops[0].id);
  }, [canSelectShop, shops, selectedShopId]);

  /** 상단 요약용: 매장 설정(목표) + 판매일보(실적) 로드 */
  useEffect(() => {
    if (!shopId) {
      setSalesTargetMonthly(null);
      setReportEntries([]);
      return;
    }
    setSummaryLoading(true);
    const [y, m] = summaryMonth.split("-").map(Number);
    const monthStart = `${summaryMonth}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${summaryMonth}-${String(lastDay).padStart(2, "0")}`;

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
        setReportEntries(list.filter((e: ReportEntry) => {
          const d = (e.sale_date ?? e.saleDate ?? "").slice(0, 10);
          return d >= monthStart && d <= monthEnd;
        }));
      })
      .catch(() => {
        setSalesTargetMonthly(null);
        setReportEntries([]);
      })
      .finally(() => setSummaryLoading(false));
  }, [shopId, summaryMonth]);

  /** 유입/개통 통계 로드 */
  useEffect(() => {
    if (!shopId) {
      setStatsData(null);
      return;
    }
    setStatsLoading(true);
    fetch(
      `/api/stats/inflow-activation?shop_id=${encodeURIComponent(shopId)}&month=${encodeURIComponent(summaryMonth)}`,
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

  /** 이번 달(선택 월) 상담·예정건 필터 */
  const consultationsInMonth = useMemo(() => {
    const prefix = summaryMonth + "-";
    return consultations.filter((c) => (c.consultation_date ?? "").slice(0, 7) === summaryMonth);
  }, [consultations, summaryMonth]);
  const pendingInMonth = useMemo(
    () => consultationsInMonth.filter((c) => c.activation_status === "△"),
    [consultationsInMonth]
  );

  /** 요약 수치 및 일별 실적 (판매일보 업로드 데이터 기반) */
  const summarySheet = useMemo(() => {
    const [y, m] = summaryMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
    const elapsedDays = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

    const goal = salesTargetMonthly ?? 0;
    const actual = reportEntries.length;
    const remain = Math.max(0, goal - actual);
    const avgGoalPerDay = daysInMonth > 0 ? goal / daysInMonth : 0;
    const avgActualPerDay = elapsedDays > 0 ? actual / elapsedDays : 0;

    const dailyCounts: number[] = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${summaryMonth}-${String(day).padStart(2, "0")}`;
      return reportEntries.filter((e) => (e.sale_date ?? e.saleDate ?? "").slice(0, 10) === dateStr).length;
    });

    return {
      goal,
      actual,
      remain,
      daysInMonth,
      elapsedDays,
      avgGoalPerDay,
      avgActualPerDay,
      dailyCounts,
      hasGoal: goal > 0,
    };
  }, [summaryMonth, salesTargetMonthly, reportEntries]);

  const [form, setForm] = useState<CrmFormState>({
    name: "",
    phone: "",
    product_name: "",
    memo: "",
    consultation_date: new Date().toISOString().slice(0, 10),
    sales_person: "",
    activation_status: "X",
    inflow_type: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const submitConsultation = async () => {
    const name = form.name.trim();
    if (!name) {
      setError("고객명을 입력하세요.");
      return;
    }
    if (!shopId) {
      setError("매장을 선택하세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: shopId,
          name,
          phone: form.phone.trim() || undefined,
          product_name: form.product_name.trim() || undefined,
          memo: form.memo.trim() || undefined,
          consultation_date: form.consultation_date,
          sales_person: form.sales_person.trim() || undefined,
          activation_status: form.activation_status,
          inflow_type: form.inflow_type || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "등록 실패");
      }
      setForm({
        name: "",
        phone: "",
        product_name: "",
        memo: "",
        consultation_date: new Date().toISOString().slice(0, 10),
        sales_person: "",
        activation_status: "X",
        inflow_type: "",
      });
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, activation_status: "O" | "△" | "X") => {
    try {
      const res = await fetch(`/api/crm/consultations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activation_status }),
      });
      if (!res.ok) throw new Error("변경 실패");
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경 실패");
    }
  };

  const moveToReport = async (id: string) => {
    try {
      const res = await fetch(`/api/crm/consultations/${id}/move-to-report`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "이동 실패");
      }
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "이동 실패");
    }
  };

  return React.createElement(CrmPageView, {
    error,
    canSelectShop,
    shops,
    shopId,
    selectedShopId,
    setSelectedShopId,
    summaryMonth,
    setSummaryMonth,
    summaryLoading,
    summarySheet,
    statsLoading,
    statsData,
    form,
    setForm,
    submitConsultation,
    submitting,
    filterStatus,
    setFilterStatus,
    loading,
    consultations,
    updateStatus,
    moveToReport,
    consultationsInMonth,
    pendingInMonth,
  });
}
