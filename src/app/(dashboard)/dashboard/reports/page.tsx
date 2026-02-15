"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExcelUpload } from "@/components/reports/excel-upload";
import { useAuthStore } from "@/client/store/useAuthStore";
import { useReportsStore } from "@/client/store/useReportsStore";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const shopId = user?.shopId ?? "";
  const entriesRaw = useReportsStore((s) => s.entries);
  const entries = useMemo(
    () => entriesRaw.filter((e) => e.shopId === shopId),
    [entriesRaw, shopId]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">판매 일보</h1>
        <p className="mt-1 text-muted-foreground">엑셀 업로드로 불러온 고객 데이터가 대시보드에 반영됩니다.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>엑셀에서 고객 데이터 가져오기</CardTitle>
          <CardDescription>
            판매일보 엑셀의 첫 행을 헤더(이름, 연락처, 생년월일, 주소, 유입, 통신사, 판매일, 상품명, 금액, 마진 등)로 인식합니다.
            업로드하면 이 매장의 일보에 추가되고 대시보드 요약에 반영됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {shopId ? (
            <ExcelUpload shopId={shopId} />
          ) : (
            <p className="text-sm text-muted-foreground">매장에 소속된 계정으로 로그인하면 업로드할 수 있습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>추출된 고객 목록</CardTitle>
            <CardDescription>업로드한 엑셀에서 추린 고객 데이터입니다. 대시보드 오늘 개통/예상 마진에 반영됩니다.</CardDescription>
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
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 업로드한 데이터가 없습니다. 위에서 엑셀을 업로드해 주세요.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-border/50 bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 font-medium text-muted-foreground">No.</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">고객명</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">연락처</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">판매일</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">상품</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground text-right">금액</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground text-right">마진</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="px-3 py-2 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2">{e.name || "—"}</td>
                      <td className="px-3 py-2">{e.phone || "—"}</td>
                      <td className="px-3 py-2">{e.saleDate ? e.saleDate.slice(0, 10) : "—"}</td>
                      <td className="px-3 py-2">{e.productName || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.amount != null ? e.amount.toLocaleString() : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.margin != null ? e.margin.toLocaleString() : "—"}</td>
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
