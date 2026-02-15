import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">고객 관리</h1>
        <p className="mt-1 text-muted-foreground">상담·예약·개통 타임라인과 유입 경로별 통계 (준비 중)</p>
      </div>
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>CRM</CardTitle>
          <CardDescription>고객별 상담 이력과 유입 채널 분석이 여기에 표시됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">연동 후 이용 가능합니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
