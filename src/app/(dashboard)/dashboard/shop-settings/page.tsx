"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/client/store/useAuthStore";

export default function ShopSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);

  const canManage = user?.role === "tenant_admin" || user?.role === "super_admin";
  const shops = getShopsForCurrentUser();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!canManage) {
      router.replace("/dashboard");
      return;
    }
  }, [user, canManage, router]);

  if (!user || !canManage) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        접근 권한을 확인 중입니다...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          매장 설정
        </h1>
        <p className="mt-1 text-muted-foreground">
          본인 매장의 마진 정책, 실적 목표 등을 설정합니다. 판매사에게는 이 메뉴가 보이지 않습니다.
        </p>
      </div>

      {user.role === "tenant_admin" && user.shopId && (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>내 매장</CardTitle>
            <CardDescription>현재 로그인한 매장주 계정의 소속 매장입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {shops.map((s) => (
              <p key={s.id} className="font-medium text-foreground">{s.name}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>매장 마진 정책</CardTitle>
          <CardDescription>
            이 매장에만 적용되는 마진·정산 규칙입니다. (데이터 격리: shop_id 기준)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" disabled>마진률 설정 (준비 중)</Button>
          <p className="mt-2 text-sm text-muted-foreground">
            백엔드 연동 후 여기서 매장별 마진 정책을 입력할 수 있습니다.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>실적·목표</CardTitle>
          <CardDescription>매장별·기간별 실적 통계 및 목표 설정.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" disabled>실적 목표 설정 (준비 중)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
