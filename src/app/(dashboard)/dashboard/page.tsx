"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/client/store/useAuthStore";
import { useReportsStore } from "@/client/store/useReportsStore";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const shopId = user?.shopId ?? "";
  const todayCount = useReportsStore((s) => {
    if (!shopId) return 0;
    const today = new Date().toISOString().slice(0, 10);
    return s.entries.filter(
      (e) => e.shopId === shopId && e.saleDate && e.saleDate.slice(0, 10) === today
    ).length;
  });
  const todayMargin = useReportsStore((s) => {
    if (!shopId) return 0;
    const today = new Date().toISOString().slice(0, 10);
    return s.entries
      .filter(
        (e) => e.shopId === shopId && e.saleDate && e.saleDate.slice(0, 10) === today
      )
      .reduce((sum, e) => sum + (e.margin ?? 0), 0);
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          대시보드
        </h1>
        <p className="mt-1 text-muted-foreground">
          오늘의 현황과 빠른 작업을 확인하세요.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <p className="mt-1 text-xs text-muted-foreground">
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
            <p className="mt-1 text-xs text-muted-foreground">설정 후 표시</p>
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
              {shopId ? (todayMargin !== 0 ? todayMargin.toLocaleString() + "원" : "0원") : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">금일 판매일보 기준</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
            <CardDescription>자주 쓰는 메뉴로 바로 이동합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              단계별 질문으로 20개 항목을 줄여주는 스마트 견적기로 바로 갑니다.
            </p>
            <Link href="/dashboard/contract/new">
              <Button className="w-full sm:w-auto" size="lg">
                새 계약·상담 등록
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>오늘의 판매 일보</CardTitle>
            <CardDescription>엑셀 업로드로 불러온 고객 데이터가 여기와 대시보드에 반영됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              판매일보 페이지에서 엑셀을 업로드하면 추출된 고객 데이터가 대시보드 요약에 반영됩니다.
            </p>
            <Link href="/dashboard/reports">
              <Button variant="outline" size="sm">판매 일보로 이동</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
