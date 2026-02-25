/**
 * 판매일보 페이지
 * 
 * 역할:
 * - 엑셀 파일 업로드를 통한 판매일보 데이터 관리
 * - 매장별 판매일보 조회 및 검색
 * - 고객 데이터 목록 표시 (이름, 연락처, 판매일, 상품, 금액, 마진)
 * 
 * 권한:
 * - super_admin: 모든 매장의 판매일보 조회 및 업로드 가능
 * - tenant_admin: 본인 매장의 판매일보 조회 및 업로드 가능
 * - staff: 본인 매장의 판매일보 조회 및 업로드 가능
 * - customer: 본인 매장의 판매일보 조회만 가능 (업로드 불가)
 * 
 * @file page.tsx
 */

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExcelUpload } from "@/components/reports/excel-upload";
import { QuickAddReportModal } from "@/components/reports/quick-add-report-modal";
import { UploadDropdown } from "@/components/reports/upload-dropdown";
import { useAuthStore } from "@/client/store/useAuthStore";
import { useReportsStore, type ReportEntry } from "@/client/store/useReportsStore";
import { getSalesPersonSalaryRows } from "@/lib/salary-calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** DB에 저장된 급여 스냅샷 한 건 */
interface SalarySnapshot {
  id: string;
  shop_id: string;
  sales_person: string;
  period_start: string;
  period_end: string;
  sale_count: number;
  total_margin: number;
  total_support: number;
  calculated_salary: number;
  created_at: string;
}

/**
 * 판매일보 페이지 컴포넌트
 * 
 * 주요 기능:
 * - 엑셀 파일 업로드 (권한 있는 사용자만)
 * - 매장 선택 (슈퍼 어드민 또는 여러 매장 소속 시)
 * - 고객 데이터 검색 (이름 또는 연락처)
 * - 판매일보 목록 표시 및 삭제
 */
export default function ReportsPage() {
  // 인증 및 매장 정보
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);
  const shops = getShopsForCurrentUser(); // 현재 사용자가 접근 가능한 매장 목록
  const userShopId = user?.shopId ?? ""; // 사용자 소속 매장 ID
  const [selectedShopId, setSelectedShopId] = useState<string>(userShopId); // 선택된 매장 ID (슈퍼 어드민 또는 여러 매장 소속 시)
  const entriesRaw = useReportsStore((s) => s.entries); // 모든 판매일보 항목
  const updateEntry = useReportsStore((s) => s.updateEntry);
  const deleteEntry = useReportsStore((s) => s.deleteEntry);
  const loadEntries = useReportsStore((s) => s.loadEntries);
  const [searchQuery, setSearchQuery] = useState(""); // 검색어 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<ReportEntry> | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  /** 급여 DB 저장·이력 */
  const [salaryHistory, setSalaryHistory] = useState<SalarySnapshot[]>([]);
  const [salaryHistoryLoading, setSalaryHistoryLoading] = useState(false);
  const [saveSalaryLoading, setSaveSalaryLoading] = useState(false);
  const [salaryToast, setSalaryToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 개별 매장(지점): 해당 매장만 표시. 슈퍼 어드민만 매장 선택 가능.
  const isSuperAdmin = user?.role === "super_admin";
  const isBranchUser = user?.role === "tenant_admin" || user?.role === "staff";
  const shopId = isBranchUser
    ? userShopId
    : (selectedShopId || userShopId || (shops.length > 0 ? shops[0]?.id : ""));

  const canUpload = !!user;

  /**
   * 서버에서 판매일보 데이터 불러오기
   * 
   * - user.role / shopId 기준으로 /api/reports GET 호출
   * - super_admin: 전체 조회
   * - tenant_admin/staff: 본인 매장만 조회
   */
  useEffect(() => {
    if (!user) return;
    // super_admin이 아니고 shopId가 없으면 조회하지 않음
    if (user.role !== "super_admin" && !shopId) return;
    loadEntries(shopId || null, user.role);
  }, [user, shopId, loadEntries]);
  
  /**
   * 고객별 거래 그룹화 인터페이스
   * 
   * 같은 고객(이름 또는 연락처 기준)의 모든 거래를 그룹화합니다.
   */
  interface CustomerGroup {
    customerKey: string; // 고객 식별 키 (이름_연락처)
    name: string; // 고객명
    phone: string; // 연락처
    birthDate: string; // 생년월일
    address: string; // 주소
    path: string; // 유입 경로
    existingCarrier: string; // 기존 통신사
    transactions: ReportEntry[]; // 해당 고객의 모든 거래
    totalCount: number; // 총 거래 건수
    totalAmount: number; // 총 거래 금액
    totalMargin: number; // 총 마진
  }

  /**
   * 필터링된 판매일보 항목
   * 
   * 필터링 조건:
   * 1. 선택된 매장의 데이터만 표시
   * 2. 검색어가 있으면 다음 필드에서 검색 (대소문자 구분 없음):
   *    - 고객명
   *    - 연락처
   *    - 상품명
   *    - 판매일
   *    - 주소
   */
  const entries = useMemo(() => {
    // 먼저 매장별로 필터링
    const filtered = entriesRaw.filter((e) => e.shopId === shopId);
    // 검색어가 없으면 전체 반환
    if (!searchQuery.trim()) return filtered;
    
    // 검색어로 필터링 (여러 필드에서 검색)
    const query = searchQuery.toLowerCase().trim();
    return filtered.filter((e) => {
      // 고객명 검색
      if (e.name?.toLowerCase().includes(query)) return true;
      // 연락처 검색 (하이픈, 공백 제거 후 비교)
      const phoneNormalized = e.phone?.replace(/[-\s]/g, "").toLowerCase() || "";
      const queryNormalized = query.replace(/[-\s]/g, "");
      if (phoneNormalized.includes(queryNormalized)) return true;
      // 상품명 검색
      if (e.productName?.toLowerCase().includes(query)) return true;
      // 판매일 검색 (YYYY-MM-DD 형식 또는 부분 일치)
      if (e.saleDate?.toLowerCase().includes(query)) return true;
      // 주소 검색
      if (e.address?.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [entriesRaw, shopId, searchQuery]);

  /**
   * 고객별 거래 그룹화
   * 
   * 검색어가 있을 때 같은 고객의 거래를 그룹화합니다.
   * 고객 식별 기준: 이름 또는 연락처가 일치하면 같은 고객으로 간주
   */
  const customerGroups = useMemo<CustomerGroup[]>(() => {
    if (!searchQuery.trim() || entries.length === 0) return [];

    // 고객별로 그룹화
    const groupsMap = new Map<string, CustomerGroup>();

    entries.forEach((entry) => {
      // 고객 식별 키 생성 (이름_연락처 조합)
      const nameKey = entry.name?.trim().toLowerCase() || "";
      const phoneKey = entry.phone?.trim().replace(/[-\s]/g, "") || "";
      const customerKey = `${nameKey}_${phoneKey}`;

      // 기존 그룹이 있으면 거래 추가, 없으면 새 그룹 생성
      if (groupsMap.has(customerKey)) {
        const group = groupsMap.get(customerKey)!;
        group.transactions.push(entry);
        group.totalCount += 1;
        group.totalAmount += entry.amount || 0;
        group.totalMargin += entry.margin || 0;
      } else {
        groupsMap.set(customerKey, {
          customerKey,
          name: entry.name || "",
          phone: entry.phone || "",
          birthDate: entry.birthDate || "",
          address: entry.address || "",
          path: entry.path || "",
          existingCarrier: entry.existingCarrier || "",
          transactions: [entry],
          totalCount: 1,
          totalAmount: entry.amount || 0,
          totalMargin: entry.margin || 0,
        });
      }
    });

    // 거래일 기준으로 정렬 (최신순)
    return Array.from(groupsMap.values()).map((group) => ({
      ...group,
      transactions: group.transactions.sort((a, b) => {
        const dateA = a.saleDate ? new Date(a.saleDate).getTime() : 0;
        const dateB = b.saleDate ? new Date(b.saleDate).getTime() : 0;
        return dateB - dateA; // 최신순
      }),
    }));
  }, [entries, searchQuery]);

  /** 판매사별 지원금 내역 (현재 매장 전체 데이터 기준) */
  const salesPersonSupportSummary = useMemo(() => {
    const list = entriesRaw.filter((e) => e.shopId === shopId);
    const map = new Map<string, { count: number; totalSupport: number }>();
    list.forEach((e) => {
      const key = (e.salesPerson ?? "").trim() || "(미지정)";
      const cur = map.get(key) ?? { count: 0, totalSupport: 0 };
      map.set(key, {
        count: cur.count + 1,
        totalSupport: cur.totalSupport + (e.supportAmount ?? 0),
      });
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ salesPerson: name, ...v }))
      .sort((a, b) => b.totalSupport - a.totalSupport);
  }, [entriesRaw, shopId]);

  /** 매장주·슈퍼어드민만: 판매일보 기반 판매사별 급여 계산 (건당 3만원 기준) */
  const canShowSalary = user?.role === "tenant_admin" || user?.role === "super_admin";
  const salesPersonSalaryRows = useMemo(() => {
    if (!shopId || !canShowSalary) return [];
    const list = entriesRaw.filter((e) => e.shopId === shopId);
    return getSalesPersonSalaryRows(list);
  }, [entriesRaw, shopId, canShowSalary]);

  /** 판매사(staff) 전용: 로그인한 본인 이름과 일치하는 판매 건만 집계한 "나의 실적" */
  const isStaff = user?.role === "staff";
  const myPerformanceRow = useMemo(() => {
    if (!shopId || !isStaff || !user?.name?.trim()) return null;
    const myName = user.name.trim();
    const list = entriesRaw.filter(
      (e) => e.shopId === shopId && (e.salesPerson ?? "").trim() === myName
    );
    const rows = getSalesPersonSalaryRows(list);
    return rows.length > 0 ? rows[0] : null;
  }, [entriesRaw, shopId, isStaff, user?.name]);

  /**
   * 슈퍼 어드민이거나 매장이 여러 개면 첫 번째 매장을 자동 선택
   * 
   * 초기 로드 시 또는 매장 목록이 변경될 때 실행됩니다.
   * 슈퍼 어드민은 매장이 없어도 업로드 가능하므로, 매장이 있으면 첫 번째 매장을 선택합니다.
   */
  useEffect(() => {
    if ((isSuperAdmin || shops.length > 1) && !selectedShopId && shops.length > 0) {
      setSelectedShopId(shops[0].id);
    }
  }, [isSuperAdmin, shops, selectedShopId]);

  /** 급여 이력 조회 (매장주/슈퍼어드민: 전체, 판매사: 본인만) */
  const loadSalaryHistory = useCallback(async () => {
    if (!shopId) return;
    setSalaryHistoryLoading(true);
    try {
      const params = new URLSearchParams({ shop_id: shopId, role: user?.role ?? "" });
      if (user?.role === "staff" && user?.name?.trim()) params.set("sales_person", user.name.trim());
      const res = await fetch(`/api/salaries?${params}`);
      const json = await res.json().catch(() => []);
      setSalaryHistory(Array.isArray(json) ? (json as SalarySnapshot[]) : []);
    } catch {
      setSalaryHistory([]);
    } finally {
      setSalaryHistoryLoading(false);
    }
  }, [shopId, user?.role, user?.name]);

  useEffect(() => {
    if (!shopId || !user) return;
    if (user.role === "tenant_admin" || user.role === "super_admin" || user.role === "staff") {
      loadSalaryHistory();
    }
  }, [shopId, user, loadSalaryHistory]);

  /** 현재 월 기준으로 급여 스냅샷 저장 */
  const handleSaveSalarySnapshot = useCallback(async () => {
    if (!user || !shopId || !canShowSalary || salesPersonSalaryRows.length === 0) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const periodStart = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const periodEnd = new Date(y, m + 1, 0).toISOString().slice(0, 10);

    setSaveSalaryLoading(true);
    setSalaryToast(null);
    try {
      const res = await fetch("/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user.role,
        },
        body: JSON.stringify({
          shop_id: shopId,
          period_start: periodStart,
          period_end: periodEnd,
          rows: salesPersonSalaryRows.map((r) => ({
            salesPerson: r.salesPerson,
            count: r.count,
            totalMargin: r.totalMargin,
            totalSupport: r.totalSupport,
            calculatedSalary: r.calculatedSalary,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSalaryToast({ type: "error", text: json?.error ?? "급여 저장에 실패했습니다." });
        return;
      }
      setSalaryToast({ type: "success", text: "이번 달 급여가 DB에 저장되었습니다." });
      setTimeout(() => setSalaryToast(null), 3000);
      loadSalaryHistory();
    } catch {
      setSalaryToast({ type: "error", text: "급여 저장 중 오류가 발생했습니다." });
    } finally {
      setSaveSalaryLoading(false);
    }
  }, [user, shopId, canShowSalary, salesPersonSalaryRows, loadSalaryHistory]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">판매 일보</h1>
          <p className="mt-2 text-muted-foreground">엑셀 업로드로 불러온 고객 데이터가 대시보드에 반영됩니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canUpload && shopId && (
            <Button type="button" variant="outline" size="sm" onClick={() => setQuickAddOpen(true)}>
              한 건 추가
            </Button>
          )}
          {canUpload && (
          <UploadDropdown
            shopId={shopId || (isSuperAdmin && shops.length > 0 ? shops[0]?.id : null)}
            noShopMessage={
              isSuperAdmin
                ? "매장을 선택하거나 먼저 매장을 등록해주세요."
                : "매장에 소속된 계정으로 로그인하거나 매장을 등록하면 업로드할 수 있습니다."
            }
          />
          )}
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>엑셀에서 고객 데이터 가져오기</CardTitle>
          <CardDescription>
            판매일보 엑셀의 첫 행을 헤더로 인식하며, 다양한 컬럼명을 자동으로 매핑합니다.
            업로드하면 이 매장의 일보에 추가되고 대시보드 요약에 반영됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canUpload ? (
            <p className="text-sm text-muted-foreground">판매일보 업로드는 매장주 또는 판매사 계정만 가능합니다. 일반 고객은 조회만 가능합니다.</p>
          ) : !isSuperAdmin && shops.length === 0 && !userShopId ? (
            <p className="text-sm text-muted-foreground">매장에 소속된 계정으로 로그인하거나 매장을 등록하면 업로드할 수 있습니다.</p>
          ) : (
            <>
              {/* 슈퍼 어드민만 매장 선택 가능. 개별 매장(지점)은 자기 매장만 보임 */}
              {isSuperAdmin && shops.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">매장 선택</label>
                  <select
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* 슈퍼 어드민이 매장이 없으면 안내 메시지, 있으면 업로드 가능 */}
              {isSuperAdmin && shops.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  매장이 등록되지 않았습니다. 시스템 관리 페이지에서 매장을 등록한 후 업로드할 수 있습니다.
                  <br />
                  <span className="text-xs">또는 우측 상단의 + 버튼을 사용하여 업로드할 수 있습니다.</span>
                </p>
              ) : shopId ? (
                <ExcelUpload shopId={shopId} />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {shopId && salesPersonSupportSummary.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>판매사별 지원금 내역</CardTitle>
            <CardDescription>고객에게 지원한 금액을 판매사별로 합산한 내역입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-border/50 bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground">판매사</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">건수</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">지원금 합계</th>
                  </tr>
                </thead>
                <tbody>
                  {salesPersonSupportSummary.map((row) => (
                    <tr key={row.salesPerson} className="border-b border-border/30">
                      <td className="px-4 py-3">{row.salesPerson}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.count}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {row.totalSupport.toLocaleString()}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {isStaff && shopId && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>나의 실적</CardTitle>
            <CardDescription>
              판매일보에 본인 이름이 &quot;판매사&quot;로 기재된 건만 집계합니다. 건당 3만원 인센티브 기준 예상 급여가 표시됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myPerformanceRow ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-border/50 bg-muted/60">
                    <tr>
                      <th className="px-4 py-3 font-medium text-muted-foreground">판매사</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">건수</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">마진 합계</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">지원금 합계</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">계산 급여</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td className="px-4 py-3 font-medium">{myPerformanceRow.salesPerson}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{myPerformanceRow.count}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{myPerformanceRow.totalMargin.toLocaleString()}원</td>
                      <td className="px-4 py-3 text-right tabular-nums">{myPerformanceRow.totalSupport.toLocaleString()}원</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-primary">
                        {myPerformanceRow.calculatedSalary.toLocaleString()}원
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                기록된 판매 실적이 없습니다. 판매일보의 &quot;판매사&quot; 필드에 본인 이름이 기재된 건만 집계됩니다. 동명이인은 이름·연락처로 구분됩니다.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {canShowSalary && shopId && salesPersonSalaryRows.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>판매사별 급여</CardTitle>
              <CardDescription>
                판매일보 기준 급여 계산 (건당 3만원 인센티브). 매장주·본사만 조회 가능합니다. 저장 시 DB에 이력이 쌓입니다.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={saveSalaryLoading}
              onClick={handleSaveSalarySnapshot}
            >
              {saveSalaryLoading ? "저장 중..." : "이번 달 급여 저장"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-border/50 bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground">판매사</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">건수</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">마진 합계</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">지원금 합계</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">계산 급여</th>
                  </tr>
                </thead>
                <tbody>
                  {salesPersonSalaryRows.map((row) => (
                    <tr key={row.salesPerson} className="border-b border-border/30">
                      <td className="px-4 py-3">{row.salesPerson}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.count}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.totalMargin.toLocaleString()}원</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.totalSupport.toLocaleString()}원</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-primary">
                        {row.calculatedSalary.toLocaleString()}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {(canShowSalary || isStaff) && shopId && (
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle>급여 이력</CardTitle>
              <CardDescription>
                DB에 저장된 급여 스냅샷입니다. 매장주·본사는 전체, 판매사는 본인만 표시됩니다.
              </CardDescription>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={loadSalaryHistory} disabled={salaryHistoryLoading}>
              {salaryHistoryLoading ? "불러오는 중..." : "새로고침"}
            </Button>
          </CardHeader>
          <CardContent>
            {salaryHistoryLoading && salaryHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">이력을 불러오는 중...</p>
            ) : salaryHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                저장된 급여 이력이 없습니다. 위 &quot;이번 달 급여 저장&quot;으로 저장하면 여기에 쌓입니다.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-border/50 bg-muted/60">
                    <tr>
                      <th className="px-4 py-3 font-medium text-muted-foreground">기간</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">판매사</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">건수</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">계산 급여</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">저장 일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryHistory.map((row) => (
                      <tr key={row.id} className="border-b border-border/30">
                        <td className="px-4 py-3 tabular-nums">
                          {row.period_start} ~ {row.period_end}
                        </td>
                        <td className="px-4 py-3">{row.sales_person}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.sale_count}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {Number(row.calculated_salary).toLocaleString()}원
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.created_at ? new Date(row.created_at).toLocaleString("ko-KR") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {salaryToast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            salaryToast.type === "success"
              ? "bg-green-600 text-white dark:bg-green-700"
              : "bg-destructive text-destructive-foreground"
          }`}
          role="alert"
        >
          {salaryToast.text}
        </div>
      )}

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="min-w-0 flex-1">
            <CardTitle>추출된 고객 목록</CardTitle>
            <CardDescription>
              판매사·고객명·연락처·개통단말기·통신사·요금제·거래 후 최종 마진을 표시합니다. 대시보드 오늘 개통/예상 마진에 반영됩니다.
              {isBranchUser && " (개별 매장은 본인 매장 데이터만 조회됩니다.)"}
            </CardDescription>
          </div>
          {entries.length > 0 && shopId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => useReportsStore.getState().clearByShop(shopId)}
              className="text-muted-foreground"
            >
              전체 삭제
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {entriesRaw.filter((e) => e.shopId === shopId).length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 업로드한 데이터가 없습니다. 위에서 엑셀을 업로드해 주세요.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="relative max-w-sm flex-1">
                  <svg
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <Input
                    type="text"
                    placeholder="고객명, 연락처, 상품명, 판매일, 주소로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground"
                  >
                    초기화
                  </Button>
                )}
              </div>
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {searchQuery.trim()
                    ? "검색 결과가 없습니다. 다른 검색어를 입력해 주세요."
                    : "아직 업로드한 데이터가 없습니다. 위에서 엑셀을 업로드해 주세요."}
                </p>
              ) : (
                <>
                  {/* 검색 결과 개수 표시 */}
                  {searchQuery.trim() && (
                    <div className="mb-4 flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2">
                      <span className="text-sm font-medium text-foreground">
                        검색 결과: <span className="text-primary">{entries.length}</span>건
                      </span>
                      {customerGroups.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {customerGroups.length}명의 고객
                        </span>
                      )}
                    </div>
                  )}
                  {searchQuery.trim() && customerGroups.length > 0 ? (
                // 검색어가 있을 때: 고객별 그룹화 뷰
                <div className="space-y-4">
                  {customerGroups.map((group) => (
                    <Card key={group.customerKey} className="border-border/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {group.name || "이름 없음"}
                              {group.phone && (
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                  ({group.phone})
                                </span>
                              )}
                            </CardTitle>
                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                              {group.birthDate && (
                                <span>생년월일: {group.birthDate}</span>
                              )}
                              {group.address && <span>주소: {group.address}</span>}
                              {group.path && <span>유입: {group.path}</span>}
                              {group.existingCarrier && (
                                <span>기존 통신사: {group.existingCarrier}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-foreground">
                              총 {group.totalCount}건
                            </div>
                            <div className="text-xs text-muted-foreground">
                              총액: {group.totalAmount.toLocaleString()}원
                            </div>
                            <div className="text-xs text-muted-foreground">
                              총 마진: {group.totalMargin.toLocaleString()}원
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-left text-sm">
                            <thead className="border-b border-border/50 bg-muted/60">
                              <tr>
                                <th className="px-3 py-2 font-medium text-muted-foreground">No.</th>
                                <th className="px-3 py-2 font-medium text-muted-foreground">판매일</th>
                                <th className="px-3 py-2 font-medium text-muted-foreground">개통단말기</th>
                                <th className="px-3 py-2 font-medium text-muted-foreground text-right">금액</th>
                                <th className="px-3 py-2 font-medium text-muted-foreground text-right">최종 마진</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.transactions.map((transaction, idx) => (
                                <tr
                                  key={transaction.id}
                                  className="border-b border-border/30 hover:bg-muted/30"
                                >
                                  <td className="px-3 py-2 tabular-nums">{idx + 1}</td>
                                  <td className="px-3 py-2">
                                    {transaction.saleDate
                                      ? transaction.saleDate.slice(0, 10)
                                      : "—"}
                                  </td>
                                  <td className="px-3 py-2">{transaction.productName || "—"}</td>
                                  <td className="px-3 py-2 text-right tabular-nums">
                                    {transaction.amount != null
                                      ? transaction.amount.toLocaleString()
                                      : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums">
                                    {transaction.margin != null
                                      ? transaction.margin.toLocaleString()
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                              {/* 합계 행 */}
                              <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                                <td className="px-3 py-2" colSpan={3}>
                                  합계
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {group.totalAmount.toLocaleString()}원
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-primary">
                                  {group.totalMargin.toLocaleString()}원
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                  ) : (
                    // 검색어가 있지만 그룹화되지 않은 경우: 전체 목록 뷰
                    <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="border-b border-border/50 bg-muted/60">
                      <tr>
                        <th className="px-3 py-2 font-medium text-muted-foreground">No.</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">판매사</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">고객명</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">연락처</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">개통단말기</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">통신사</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">요금제</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">판매일</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground text-right">금액</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground text-right">최종 마진</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground text-right">지원금</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground w-24">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e, i) => (
                        editingId === e.id && editDraft ? (
                          <tr key={e.id} className="border-b border-border/50 bg-muted/30">
                            <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{i + 1}</td>
                            <td className="px-2 py-1.5">
                              <Input className="h-8 text-sm" value={editDraft.salesPerson ?? ""} onChange={(ev) => setEditDraft((d) => ({ ...d, salesPerson: ev.target.value }))} placeholder="판매사" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input className="h-8 text-sm" value={editDraft.name ?? ""} onChange={(ev) => setEditDraft((d) => ({ ...d, name: ev.target.value }))} placeholder="고객명" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input className="h-8 text-sm" value={editDraft.phone ?? ""} onChange={(ev) => setEditDraft((d) => ({ ...d, phone: ev.target.value }))} placeholder="연락처" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input className="h-8 text-sm" value={editDraft.productName ?? ""} onChange={(ev) => setEditDraft((d) => ({ ...d, productName: ev.target.value }))} placeholder="개통단말기" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input className="h-8 text-sm" value={editDraft.existingCarrier ?? ""} onChange={(ev) => setEditDraft((d) => ({ ...d, existingCarrier: ev.target.value }))} placeholder="통신사" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input className="h-8 text-sm" value={editDraft.planName ?? ""} onChange={(ev) => setEditDraft((d) => ({ ...d, planName: ev.target.value }))} placeholder="요금제" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input className="h-8 text-sm" type="date" value={editDraft.saleDate?.slice(0, 10) ?? ""} onChange={(ev) => setEditDraft((d) => ({ ...d, saleDate: ev.target.value || "" }))} />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input className="h-8 text-sm text-right" type="number" value={editDraft.amount ?? ""} onChange={(ev) => setEditDraft((d) => ({ ...d, amount: Number(ev.target.value) || 0 }))} placeholder="금액" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input className="h-8 text-sm text-right" type="number" value={editDraft.margin ?? ""} onChange={(ev) => setEditDraft((d) => ({ ...d, margin: Number(ev.target.value) || 0 }))} placeholder="최종 마진" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input className="h-8 text-sm text-right" type="number" value={editDraft.supportAmount ?? ""} onChange={(ev) => setEditDraft((d) => ({ ...d, supportAmount: Number(ev.target.value) || 0 }))} placeholder="지원금" />
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex gap-1">
                                <Button type="button" size="sm" variant="default" className="h-8 text-xs" onClick={() => {
                                  const rest = (({ id: _i, shopId: _s, uploadedAt: _u, ...r }) => r)(editDraft);
                                  updateEntry(e.id, rest);
                                  setEditingId(null);
                                  setEditDraft(null);
                                }}>저장</Button>
                                <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setEditingId(null); setEditDraft(null); }}>취소</Button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="px-3 py-2 tabular-nums">{i + 1}</td>
                            <td className="px-3 py-2">{e.salesPerson || "—"}</td>
                            <td className="px-3 py-2">{e.name || "—"}</td>
                            <td className="px-3 py-2">{e.phone || "—"}</td>
                            <td className="px-3 py-2">{e.productName || "—"}</td>
                            <td className="px-3 py-2">{e.existingCarrier || "—"}</td>
                            <td className="px-3 py-2">{e.planName || "—"}</td>
                            <td className="px-3 py-2">
                              {e.saleDate ? e.saleDate.slice(0, 10) : "—"}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {e.amount != null ? e.amount.toLocaleString() : "—"}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {e.margin != null ? e.margin.toLocaleString() : "—"}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {e.supportAmount != null ? e.supportAmount.toLocaleString() : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <Button type="button" size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setEditingId(e.id); setEditDraft({ ...e }); }}>수정</Button>
                                <Button type="button" size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => { if (typeof window !== "undefined" && window.confirm("이 행을 삭제할까요?")) deleteEntry(e.id); }}>삭제</Button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {shopId && (
        <QuickAddReportModal
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          shopId={shopId}
        />
      )}
    </div>
  );
}
