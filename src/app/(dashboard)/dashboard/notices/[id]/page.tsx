import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 목업 공지 상세 (목록과 id로 매칭, 추후 API 연동 시 교체)
const MOCK_NOTICES: Record<
  string,
  { title: string; body: string; createdAt: string; isPinned: boolean }
> = {
  "1": {
    title: "2025년 1분기 요금제·지원금 정책 안내",
    body: `통신사별 1분기 요금제 변경 및 공시지원금 정책이 반영되었습니다.

■ 적용 일자: 2025년 1월 1일
■ 변경 요약
- SKT/KT/LG U+ 요금제 개편 사항이 견적기에 반영되었습니다.
- 공시지원금은 각 통신사 최신 공지 기준으로 적용됩니다.
- 견적 작성 시 자동으로 최신 정책이 적용되니 별도 확인만 부탁드립니다.

문의: 관리자 또는 설정 메뉴의 정책 데이터에서 상세 확인 가능합니다.`,
    createdAt: "2025-02-10",
    isPinned: true,
  },
  "2": {
    title: "개통 일보 제출 일정 및 양식 안내",
    body: `본사 제출용 판매 일보 제출 일정 및 양식을 안내드립니다.

■ 제출 일정
- 매주 월요일 18:00까지 전주 판매 일보 제출
- 지연 시 정산 반영이 늦어질 수 있습니다.

■ 제출 방법
- 대시보드 > 판매 일보 메뉴에서 기간별 조회 후 엑셀 내보내기 (준비 중)
- 관리자 메뉴에서 양식 다운로드 가능 (준비 중)

■ 문의
- 제출 관련 문의는 본사 운영팀으로 연락 부탁드립니다.`,
    createdAt: "2025-02-05",
    isPinned: true,
  },
  "3": {
    title: "선택약정 할인 적용 기준 변경 안내",
    body: `선택약정 24개월/36개월 할인 적용 기준이 변경되었습니다.

■ 변경 내용
- 일부 요금제의 선택약정 할인금이 조정되었습니다.
- 계약 작성 시 시스템에 반영된 최신 기준이 자동 적용됩니다.

■ 확인 방법
- 새 계약·상담 작성 시 Step 2 요금제 선택 단계에서 월 납부금으로 확인 가능합니다.

추가 문의는 관리자에게 연락 부탁드립니다.`,
    createdAt: "2025-01-28",
    isPinned: false,
  },
  "4": {
    title: "고객 정보 조회 시 개인정보 처리 안내",
    body: `고객 연락처·생년월일 등 개인정보를 조회·입력할 때 아래 사항을 준수해 주시기 바랍니다.

■ 준수 사항
- 상담 시 고객 동의 후에만 개인정보를 입력합니다.
- 조회 이력은 최소한으로 하고, 업무 목적에 한해 이용합니다.
- 관련 가이드는 설정 > 개인정보 처리 안내에서 확인 가능합니다.

■ 위반 시
- 개인정보보호법에 따른 과태료 등 제재가 있을 수 있으니 유의 부탁드립니다.`,
    createdAt: "2025-01-15",
    isPinned: false,
  },
};

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notice = MOCK_NOTICES[id];

  if (!notice) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/notices">
          <Button variant="ghost" size="sm">
            ← 목록
          </Button>
        </Link>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            {notice.isPinned && (
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                상단고정
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              {formatDate(notice.createdAt)}
            </span>
          </div>
          <CardTitle className="text-xl">{notice.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            {notice.body}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
