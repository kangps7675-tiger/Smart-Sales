/**
 * 공지사항 상세 페이지
 * 
 * 역할:
 * - 공지사항 상세 내용 표시
 * - 상단 고정 공지 표시
 * - 목록으로 돌아가기
 * 
 * Next.js 15 동적 라우팅:
 * - params는 Promise로 전달되므로 await 필요
 * 
 * @file page.tsx
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseAdmin } from "@/server/supabase";

// 공지사항 상세는 Supabase notices 테이블에서 조회합니다.

/**
 * 날짜 포맷팅 함수
 * 
 * ISO 날짜 문자열을 한국어 형식으로 변환합니다.
 * 예: "2025-02-10" → "2025년 2월 10일"
 * 
 * @param s - ISO 날짜 문자열 (YYYY-MM-DD)
 * @returns 포맷팅된 날짜 문자열
 */
function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * 공지사항 상세 페이지 컴포넌트
 * 
 * Next.js 15에서는 params가 Promise이므로 async 함수로 선언하고 await해야 합니다.
 * 
 * @param params - 동적 라우트 파라미터 (Promise<{ id: string }>)
 */
export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("notices")
    .select("id, title, body, created_at, pinned")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const notice = {
    id: data.id as string,
    title: (data.title ?? "") as string,
    body: (data.body ?? "") as string,
    created_at: (data.created_at ?? "") as string,
    pinned: Boolean(data.pinned),
  };

  const createdAtLabel = notice.created_at
    ? formatDate(notice.created_at)
    : "";

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
            {notice.pinned && (
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                상단고정
              </span>
            )}
            {createdAtLabel && (
              <span className="text-sm text-muted-foreground">
                {createdAtLabel}
              </span>
            )}
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
