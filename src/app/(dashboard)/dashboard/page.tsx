/**
 * 대시보드 메인 페이지
 * 
 * 역할:
 * - 오늘의 현황 요약 표시 (오늘 개통 건수, 예상 마진 등)
 * - 빠른 작업 링크 제공 (새 계약 등록, 판매일보 이동)
 * - 판매일보 데이터 기반 통계 표시
 * 
 * @file page.tsx
 */

"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/client/store/useAuthStore";
import { useReportsStore } from "@/client/store/useReportsStore";

/**
 * 대시보드 메인 페이지 컴포넌트
 * 
 * 표시 정보:
 * - 오늘 개통 건수: 판매일보에서 오늘 날짜의 판매 건수
 * - 오늘 목표: 향후 설정 예정
 * - 예상 마진: 오늘 판매 건수의 총 마진 합계
 */
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const shopId = user?.shopId ?? ""; // 사용자 소속 매장 ID
  
  /**
   * 오늘 개통 건수 계산
   * 판매일보에서 오늘 날짜(saleDate)와 일치하는 항목의 개수를 반환합니다.
   */
  const todayCount = useReportsStore((s) => {
    if (!shopId) return 0;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD 형식
    return s.entries.filter(
      (e) => e.shopId === shopId && e.saleDate && e.saleDate.slice(0, 10) === today
    ).length;
  });
  
  /**
   * 오늘 예상 마진 계산
   * 판매일보에서 오늘 날짜의 판매 건수들의 margin을 합산합니다.
   */
  const todayMargin = useReportsStore((s) => {
    if (!shopId) return 0;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD 형식
    return s.entries
      .filter(
        (e) => e.shopId === shopId && e.saleDate && e.saleDate.slice(0, 10) === today
      )
      .reduce((sum, e) => sum + (e.margin ?? 0), 0); // margin 합산 (null이면 0으로 처리)
  });

  return (
    <div className="space-y-8">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          대시보드
        </h1>
        <p className="mt-2 text-muted-foreground">
          오늘의 현황과 빠른 작업을 확인하세요.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              오늘 개통
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
              {shopId ? todayCount : "—"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {shopId ? "판매일보 엑셀 반영 건수" : "첫 계약을 등록해 보세요!"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              오늘 목표
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">—</p>
            <p className="mt-2 text-xs text-muted-foreground">설정 후 표시</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              예상 마진
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums tracking-tight text-primary sm:text-5xl">
              {shopId ? (todayMargin !== 0 ? `${todayMargin.toLocaleString()}원` : "0원") : "—"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">금일 판매일보 기준</p>
          </CardContent>
        </Card>
      </div>

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
