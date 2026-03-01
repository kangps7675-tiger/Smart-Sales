"use client";

/**
 * 공지사항 수정 페이지
 * - 슈퍼 어드민만 접근
 * - 제목, 내용, 상단고정 수정 후 PATCH /api/notices/[id]
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { startNavigation } from "@/components/navigation-loading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/client/store/useAuthStore";

interface Notice {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  author_id?: string | null;
  type?: "notice" | "post";
}

export default function NoticeEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isSuperAdmin = role === "super_admin";

  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("공지 ID가 없습니다.");
      return;
    }

    const fetchNotice = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/notices/${id}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error ?? "공지를 불러오지 못했습니다.");
          return;
        }
        const n = json as Notice;
        setNotice(n);
        setTitle(n.title ?? "");
        setBody(n.body ?? "");
        setPinned(Boolean(n.pinned));

        const isNotice = (n.type ?? "notice") === "notice";
        const isOwner = Boolean(n.author_id && user?.id && n.author_id === user.id);

        // 페이지 진입 권한:
        // - super_admin: 모두 가능
        // - region_manager / tenant_admin: 자기 글만 (notice/post)
        // - staff: 자기 글 + post만
        let allowed = false;
        if (role === "super_admin") {
          allowed = true;
        } else if (role === "region_manager" || role === "tenant_admin") {
          allowed = isOwner;
        } else if (role === "staff") {
          allowed = isOwner && !isNotice;
        }

        if (!allowed) {
          setError("수정 권한이 없습니다.");
        }
      } catch (err) {
        console.error("[NoticeEdit] 조회 실패", err);
        setError("공지를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchNotice();
  }, [id, isSuperAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    if (!title.trim() || !body.trim()) {
      showToast("error", "제목과 내용을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/notices/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          pinned,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast("error", json?.error ?? "수정에 실패했습니다.");
        return;
      }
      showToast("success", "공지가 수정되었습니다.");
      startNavigation();
      router.push(`/dashboard/notices/${id}`);
    } catch (err) {
      console.error("[NoticeEdit] 수정 실패", err);
      showToast("error", "수정 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href={id ? `/dashboard/notices/${id}` : "/dashboard/notices"}>
          <Button variant="ghost" size="sm">← 목록</Button>
        </Link>
        <p className="text-sm text-muted-foreground">공지를 불러오는 중...</p>
      </div>
    );
  }

  if (error || !notice) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/notices">
          <Button variant="ghost" size="sm">← 목록</Button>
        </Link>
        <p className="text-sm text-destructive">{error ?? "공지를 찾을 수 없습니다."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/notices/${id}`}>
          <Button variant="ghost" size="sm">← 상세</Button>
        </Link>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>공지 수정</CardTitle>
          <CardDescription>제목·내용·상단고정을 수정한 뒤 저장하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">제목</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="공지 제목"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">내용</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="공지 내용"
                disabled={submitting}
                className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                disabled={submitting}
                className="h-4 w-4 rounded border-input"
              />
              상단에 고정하기
            </label>
            <div className="flex justify-end gap-2">
              <Link href={`/dashboard/notices/${id}`}>
                <Button type="button" variant="ghost" size="sm" disabled={submitting}>
                  취소
                </Button>
              </Link>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "저장 중..." : "저장"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
