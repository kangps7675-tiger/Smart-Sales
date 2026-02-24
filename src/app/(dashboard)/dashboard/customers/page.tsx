"use client";

/**
 * 고객 관리 페이지 (직원용 CRM)
 *
 * 역할:
 * - 판매일보에 기록된 데이터를 기반으로 고객 명부를 생성
 * - 고객별 거래 이력·마진 요약을 한눈에 조회
 *
 * @file page.tsx
 */

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/client/store/useAuthStore";
import { useReportsStore, type ReportEntry } from "@/client/store/useReportsStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface CustomerSummary {
  customerKey: string;
  name: string;
  phone: string;
  lastSaleDate: string;
  lastProductName: string;
  lastPlanName: string;
  /** 최근 거래 담당 판매사 (어떤 직원이 이 고객을 상대했는지) */
  lastSalesPerson: string;
  totalCount: number;
  totalAmount: number;
  totalMargin: number;
  path: string;
  existingCarrier: string;
}

export default function CustomersPage() {
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);
  const shops = getShopsForCurrentUser();
  const userShopId = user?.shopId ?? "";

  const entriesRaw = useReportsStore((s) => s.entries);
  const loadEntries = useReportsStore((s) => s.loadEntries);

  const [searchQuery, setSearchQuery] = useState("");

  const isSuperAdmin = user?.role === "super_admin";
  const isBranchUser = user?.role === "tenant_admin" || user?.role === "staff";

  const shopId = isBranchUser
    ? userShopId
    : (userShopId || (shops.length > 0 ? shops[0]?.id ?? "" : ""));

  /**
   * 서버에서 판매일보 데이터 불러오기
   *
   * - ReportsPage와 동일한 로직으로 /api/reports GET 호출
   * - super_admin: 전체 조회
   * - tenant_admin/staff: 본인 매장만 조회
   */
  useEffect(() => {
    if (!user) return;
    if (user.role !== "super_admin" && !shopId) return;
    loadEntries(shopId || null, user.role);
  }, [user, shopId, loadEntries]);

  const shopEntries = useMemo(
    () => entriesRaw.filter((e) => e.shopId === shopId),
    [entriesRaw, shopId]
  );

  const customers = useMemo<CustomerSummary[]>(() => {
    if (!shopId) return [];
    const map = new Map<string, { latest: ReportEntry; totalCount: number; totalAmount: number; totalMargin: number }>();

    for (const entry of shopEntries) {
      const nameKey = (entry.name ?? "").trim().toLowerCase();
      const phoneKey = (entry.phone ?? "").trim().replace(/[-\s]/g, "");
      if (!nameKey && !phoneKey) continue;
      const customerKey = `${nameKey}_${phoneKey}`;

      const existing = map.get(customerKey);
      const saleTime = entry.saleDate ? new Date(entry.saleDate).getTime() : 0;
      if (!existing) {
        map.set(customerKey, {
          latest: entry,
          totalCount: 1,
          totalAmount: entry.amount ?? 0,
          totalMargin: entry.margin ?? 0,
        });
      } else {
        const latestTime = existing.latest.saleDate ? new Date(existing.latest.saleDate).getTime() : 0;
        map.set(customerKey, {
          latest: saleTime >= latestTime ? entry : existing.latest,
          totalCount: existing.totalCount + 1,
          totalAmount: existing.totalAmount + (entry.amount ?? 0),
          totalMargin: existing.totalMargin + (entry.margin ?? 0),
        });
      }
    }

    let result: CustomerSummary[] = Array.from(map.entries()).map(([key, v]) => {
      const latest = v.latest;
      return {
        customerKey: key,
        name: latest.name || "",
        phone: latest.phone || "",
        lastSaleDate: latest.saleDate || "",
        lastProductName: latest.productName || "",
        lastPlanName: latest.planName || "",
        lastSalesPerson: (latest.salesPerson ?? "").trim() || "—",
        totalCount: v.totalCount,
        totalAmount: v.totalAmount,
        totalMargin: v.totalMargin,
        path: latest.path || "",
        existingCarrier: latest.existingCarrier || "",
      };
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const qNormalized = q.replace(/[-\s]/g, "");
      result = result.filter((c) => {
        const phoneNormalized = c.phone.replace(/[-\s]/g, "").toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          phoneNormalized.includes(qNormalized)
        );
      });
    }

    // 최근 거래일 기준 내림차순 정렬
    return result.sort((a, b) => {
      const tA = a.lastSaleDate ? new Date(a.lastSaleDate).getTime() : 0;
      const tB = b.lastSaleDate ? new Date(b.lastSaleDate).getTime() : 0;
      return tB - tA;
    });
  }, [shopEntries, shopId, searchQuery]);

  const totalCustomers = customers.length;
  const totalTransactions = shopEntries.length;
  const totalMargin = shopEntries.reduce((sum, e) => sum + (e.margin ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">고객 관리</h1>
        <p className="mt-2 text-muted-foreground">
          판매일보에 기록된 데이터를 기준으로 고객별 상담·개통 이력을 한눈에 모아봅니다.
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">요약</CardTitle>
          <CardDescription>
            현재 선택된 매장의 판매일보를 기반으로 추출된 고객 명부입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">고객 수</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {totalCustomers.toLocaleString()}명
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">총 거래 건수</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {totalTransactions.toLocaleString()}건
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">총 마진</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {totalMargin.toLocaleString()}원
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">고객 명부</CardTitle>
            <CardDescription>
              이름·연락처 기준으로 고객을 구분합니다 (동명이인 구별). 담당 판매사는 최근 거래 기준입니다. 검색창에 이름이나 번호 일부를 입력해 찾아보세요.
            </CardDescription>
          </div>
          <div className="w-full max-w-xs">
            <Input
              type="text"
              placeholder="고객명 또는 연락처 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {shopEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 이 매장의 판매일보 데이터가 없습니다. 먼저 판매 일보에서 엑셀 업로드나 한 건 추가를 통해 데이터를 쌓아주세요.
            </p>
          ) : customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              검색 결과가 없습니다. 다른 이름이나 연락처로 다시 검색해 보세요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/60">
                  <tr>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground">고객명</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground">연락처</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground">담당 판매사</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground">최근 거래일</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground">최근 단말기/요금제</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground">유입 경로</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground">기존 통신사</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-right">총 거래</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-right">총 마진</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.customerKey} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="px-3 py-2">{c.name || "이름 없음"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {c.phone || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{c.lastSalesPerson}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {c.lastSaleDate ? c.lastSaleDate.slice(0, 10) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {c.lastProductName || c.lastPlanName
                          ? `${c.lastProductName || "단말기 미입력"} / ${c.lastPlanName || "요금제 미입력"}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {c.path || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {c.existingCarrier || "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {c.totalCount.toLocaleString()}건
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {c.totalMargin.toLocaleString()}원
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
