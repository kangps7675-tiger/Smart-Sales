/**
 * 설정 페이지
 * 
 * 역할:
 * - 매장 정보 설정
 * - 정책 설정 (공시지원금, 요금제 등)
 * - 권한 관리
 * 
 * 현재 상태: 준비 중
 * 
 * @file page.tsx
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * 설정 페이지 컴포넌트
 * 
 * 현재는 준비 중 상태이며, 향후 매장 정보 및 정책 설정 기능이 추가될 예정입니다.
 */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">설정</h1>
        <p className="mt-1 text-muted-foreground">매장 정보, 정책, 권한 등 (준비 중)</p>
      </div>
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>일반</CardTitle>
          <CardDescription>매장명, 담당자, 공시지원금·요금제 정책 설정</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">연동 후 이용 가능합니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
