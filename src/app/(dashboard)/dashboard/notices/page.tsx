import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MOCK_NOTICES = [
  {
    id: "1",
    title: "2025년 1분기 요금제·지원금 정책 안내",
    summary:
      "통신사별 1분기 요금제 변경 및 공시지원금 정책이 반영되었습니다. 견적 시 최신 정책이 자동 적용됩니다.",
    createdAt: "2025-02-10",
    isPinned: true,
  },
  {
    id: "2",
    title: "개통 일보 제출 일정 및 양식 안내",
    summary:
      "본사 제출용 판매 일보는 매주 월요일 18:00까지 제출 부탁드립니다. 양식은 관리자 메뉴에서 다운로드 가능합니다.",
    createdAt: "2025-02-05",
    isPinned: true,
  },
  {
    id: "3",
    title: "선택약정 할인 적용 기준 변경 안내",
    summary:
      "선택약정 24개월/36개월 할인 적용 기준이 변경되었습니다. 계약 작성 시 자동 반영되니 참고 부탁드립니다.",
    createdAt: "2025-01-28",
    isPinned: false,
  },
  {
    id: "4",
    title: "고객 정보 조회 시 개인정보 처리 안내",
    summary:
      "고객 연락처·생년월일 등 개인정보 조회 시 동의 절차를 준수해 주시기 바랍니다. 관련 가이드는 설정 메뉴에서 확인 가능합니다.",
    createdAt: "2025-01-15",
    isPinned: false,
  },
];

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function NoticesPage() {
  const pinned = MOCK_NOTICES.filter((n) => n.isPinned);
  const list = MOCK_NOTICES.filter((n) => !n.isPinned);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          공지게시판
        </h1>
        <p className="mt-1 text-muted-foreground">
          고객 및 대리점이 정책적으로 알아야 할 공지·알림 사항입니다.
        </p>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>공지 목록</CardTitle>
          <CardDescription>
            중요 공지는 상단에 고정되어 있습니다. 제목을 클릭하면 상세 내용을 볼 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {pinned.map((notice) => (
              <li key={notice.id} className="py-4 first:pt-0">
                <Link
                  href={`/dashboard/notices/${notice.id}`}
                  className="group -m-2 block rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                      상단고정
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(notice.createdAt)}
                    </span>
                  </div>
                  <h3 className="mt-1 font-medium text-foreground group-hover:text-primary">
                    {notice.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {notice.summary}
                  </p>
                </Link>
              </li>
            ))}
            {list.map((notice) => (
              <li key={notice.id} className="py-4 first:pt-0">
                <Link
                  href={`/dashboard/notices/${notice.id}`}
                  className="group -m-2 block rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  <span className="text-sm text-muted-foreground">
                    {formatDate(notice.createdAt)}
                  </span>
                  <h3 className="mt-1 font-medium text-foreground group-hover:text-primary">
                    {notice.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {notice.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
