/**
 * 설정 페이지
 *
 * 역할:
 * - 매장 설정·정책으로 이동 링크
 * - 현재 로그인 정보 요약
 *
 * @file page.tsx
 */

"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore, ROLE_LABEL } from "@/client/store/useAuthStore";

/**
 * 설정 페이지 컴포넌트
 * 매장 설정·정책 링크와 현재 계정 요약을 표시합니다.
 */
export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);
  const shops = getShopsForCurrentUser();
  const canManageShop = user?.role === "tenant_admin" || user?.role === "super_admin" || user?.role === "region_manager";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">설정</h1>
        <p className="mt-1 text-muted-foreground">매장 정보, 정책, 권한 등</p>
      </div>

      {user && (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>계정 정보</CardTitle>
            <CardDescription>현재 로그인한 계정 요약</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm"><span className="font-medium">이름</span> {user.name || "—"}</p>
            <p className="text-sm"><span className="font-medium">역할</span> {ROLE_LABEL[user.role]}</p>
            {shops.length > 0 && (
              <p className="text-sm"><span className="font-medium">매장</span> {shops.map((s) => s.name).join(", ")}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>매장·정책 설정</CardTitle>
          <CardDescription>매장명, 마진률, 실적 목표, 건당 인센티브 등</CardDescription>
        </CardHeader>
        <CardContent>
          {canManageShop ? (
            <Link href="/dashboard/shop-settings">
              <Button variant="outline" size="sm">매장 설정으로 이동</Button>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">매장 설정은 매장주·지점장·슈퍼 어드민만 이용할 수 있습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
