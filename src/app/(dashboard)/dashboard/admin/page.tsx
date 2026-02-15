"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/client/store/useAuthStore";

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user === null) {
      router.replace("/login");
      return;
    }
    if (user.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (!user || user.role !== "super_admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        접근 권한을 확인 중입니다...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          시스템 관리 (슈퍼 어드민)
        </h1>
        <p className="mt-1 text-muted-foreground">
          전체 매장 구독·결제, 공통 정책을 관리합니다. 매장별 데이터는 각 매장주가 관리합니다.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">🏢</span>
              매장별 구독·결제
            </CardTitle>
            <CardDescription>
              전체 매장의 구독 상태, 결제 이력을 확인하고 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" disabled>매장 목록·구독 현황 (준비 중)</Button>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              공통 정책
            </CardTitle>
            <CardDescription>
              전체 시스템에 적용되는 요금제·지원금·개통 항목 등 공통 정책을 업데이트합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled>공통 요금제 (준비 중)</Button>
              <Button variant="outline" size="sm" disabled>공통 정책 마스터 (준비 중)</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
