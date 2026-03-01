/**
 * 시스템 관리 페이지 (슈퍼 어드민 전용)
 * 
 * 역할:
 * - 전체 매장의 판매일보 업로드 관리
 * - 매장별 구독·결제 관리 (준비 중)
 * - 공통 정책 관리 (준비 중)
 * 
 * 접근 권한:
 * - super_admin만 접근 가능
 * - 다른 역할 사용자는 대시보드로 리다이렉트
 * 
 * @file page.tsx
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/client/store/useAuthStore";
import { ExcelUpload } from "@/components/reports/excel-upload";

interface ShopRow {
  id: string;
  name: string;
  createdAt: string;
  storeGroupId: string | null;
  subscriptionStatus?: string;
}

/**
 * 시스템 관리 페이지 컴포넌트
 * 
 * 주요 기능:
 * - 매장 선택 및 해당 매장의 판매일보 업로드
 * - 매장별 구독·결제 현황 관리 (향후 구현)
 * - 공통 정책 관리 (향후 구현)
 */
export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);
  const shops = getShopsForCurrentUser();
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [allShops, setAllShops] = useState<ShopRow[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  const loadAllShops = useCallback(async () => {
    if (!user || user.role !== "super_admin") return;
    setShopsLoading(true);
    try {
      const res = await fetch("/api/shops", {
        headers: { "x-user-role": user.role },
      });
      const json = await res.json().catch(() => []);
      setAllShops(Array.isArray(json) ? json : []);
    } catch {
      setAllShops([]);
    } finally {
      setShopsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllShops();
  }, [loadAllShops]);

  /**
   * 접근 권한 체크 및 리다이렉트
   * 
   * - 로그인하지 않은 사용자: 로그인 페이지로 리다이렉트
   * - 슈퍼 어드민이 아닌 사용자: 대시보드로 리다이렉트
   */
  useEffect(() => {
    if (user === null) {
      router.replace("/login");
      return;
    }
    if (user.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  /**
   * 매장 목록이 로드되면 첫 번째 매장을 자동 선택
   */
  useEffect(() => {
    if (shops.length > 0 && !selectedShopId) {
      setSelectedShopId(shops[0].id);
    }
  }, [shops, selectedShopId]);

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
              <span className="text-lg">📊</span>
              판매일보 업로드
            </CardTitle>
            <CardDescription>
              매장별 판매일보 엑셀 파일을 업로드하여 고객 데이터를 시스템에 반영합니다. 엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {shops.length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 매장이 없습니다. 먼저 매장을 등록해 주세요.</p>
            ) : (
              <>
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
                {selectedShopId && <ExcelUpload shopId={selectedShopId} />}
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">🏢</span>
              매장 목록·구독 현황
            </CardTitle>
            <CardDescription>
              전체 매장의 구독 상태를 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {shopsLoading ? (
              <p className="text-sm text-muted-foreground">불러오는 중...</p>
            ) : allShops.length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 매장이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 text-left font-medium">매장명</th>
                      <th className="py-2 text-left font-medium">구독 상태</th>
                      <th className="py-2 text-right font-medium">생성일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allShops.map((s) => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-2 font-medium">{s.name}</td>
                        <td className="py-2">
                          <span className={
                            s.subscriptionStatus === "suspended" ? "text-destructive" :
                            s.subscriptionStatus === "trial" ? "text-amber-600" : "text-muted-foreground"
                          }>
                            {s.subscriptionStatus === "trial" ? "체험" : s.subscriptionStatus === "suspended" ? "중지" : "활성"}
                          </span>
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString("ko-KR") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-3" onClick={loadAllShops} disabled={shopsLoading}>
              새로고침
            </Button>
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
              정책을 수정하면 즉시 모든 견적기에 반영됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/policies">
                <Button variant="outline" size="sm">
                  정책/단가 관리
                </Button>
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              기기 출고가, 공시지원금, 요금제 리베이트, 부가서비스 가격을 실시간으로 수정할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
