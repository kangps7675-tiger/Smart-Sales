/**
 * 공지게시판 페이지
 *
 * 역할:
 * - 시스템 공지사항 목록 표시
 * - 중요 공지 상단 고정
 * - 슈퍼 어드민의 공지 작성 기능 제공
 *
 * @file page.tsx
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/client/store/useAuthStore";

interface Notice {
  id: string;
  title: string;
  body: string;
  author_id: string | null;
  pinned: boolean;
  created_at: string;
}

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function NoticesPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newPinned, setNewPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  };

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/notices", { method: "GET" });
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error ?? "공지 목록을 불러오지 못했습니다.");
          return;
        }
        setNotices(Array.isArray(json) ? (json as Notice[]) : []);
      } catch (err) {
        console.error("[Notices] 목록 조회 실패", err);
        setError("공지 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isSuperAdmin) {
      showToast("error", "공지 작성 권한이 없습니다.");
      return;
    }
    if (!newTitle.trim() || !newBody.trim()) {
      showToast("error", "제목과 내용을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user.role,
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          body: newBody.trim(),
          author_id: user.id,
          pinned: newPinned,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const message = json?.error ?? "공지 생성에 실패했습니다.";
        showToast("error", message);
        return;
      }
      const created = json as Notice;
      setNotices((prev) => [created, ...prev]);
      setNewTitle("");
      setNewBody("");
      setNewPinned(false);
      setCreating(false);
      showToast("success", "공지가 등록되었습니다.");
    } catch (err) {
      console.error("[Notices] 공지 생성 실패", err);
      showToast("error", "공지 생성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const pinned = notices.filter((n) => n.pinned);
  const list = notices.filter((n) => !n.pinned);

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
      {isSuperAdmin && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setCreating((v) => !v)}
            className="flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            <span className="text-sm">공지 추가</span>
          </Button>
        </div>
      )}

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>공지 목록</CardTitle>
          <CardDescription>
            중요 공지는 상단에 고정되어 있습니다. 제목을 클릭하면 상세 내용을 볼 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">공지 목록을 불러오는 중입니다...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : notices.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 공지가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pinned.map((notice) => (
                <li key={notice.id} className="py-4 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/dashboard/notices/${notice.id}`}
                      className="group -m-2 flex-1 rounded-lg p-2 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                          상단고정
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(notice.created_at)}
                        </span>
                      </div>
                      <h3 className="mt-1 font-medium text-foreground group-hover:text-primary">
                        {notice.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {notice.body?.slice(0, 80) ?? ""}
                      </p>
                    </Link>
                    {isSuperAdmin && (
                      <Link href={`/dashboard/notices/${notice.id}/edit`}>
                        <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
                          수정
                        </Button>
                      </Link>
                    )}
                  </div>
                </li>
              ))}
              {list.map((notice) => (
                <li key={notice.id} className="py-4 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/dashboard/notices/${notice.id}`}
                      className="group -m-2 flex-1 rounded-lg p-2 transition-colors hover:bg-muted/50"
                    >
                      <span className="text-sm text-muted-foreground">
                        {formatDate(notice.created_at)}
                      </span>
                      <h3 className="mt-1 font-medium text-foreground group-hover:text-primary">
                        {notice.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {notice.body?.slice(0, 80) ?? ""}
                      </p>
                    </Link>
                    {isSuperAdmin && (
                      <Link href={`/dashboard/notices/${notice.id}/edit`}>
                        <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
                          수정
                        </Button>
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 슈퍼 어드민 전용 공지 작성 폼 */}
      {isSuperAdmin && creating && (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>새 공지 작성</CardTitle>
            <CardDescription>시스템 전체에 표시할 공지를 입력합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">제목</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="공지 제목을 입력하세요."
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">내용</label>
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="공지 내용을 입력하세요."
                  disabled={submitting}
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={newPinned}
                  onChange={(e) => setNewPinned(e.target.checked)}
                  disabled={submitting}
                  className="h-4 w-4 rounded border-input"
                />
                상단에 고정하기
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (submitting) return;
                    setCreating(false);
                  }}
                >
                  취소
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "등록 중..." : "등록"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-600 text-white dark:bg-green-700"
              : "bg-destructive text-destructive-foreground"
          }`}
          role="alert"
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
