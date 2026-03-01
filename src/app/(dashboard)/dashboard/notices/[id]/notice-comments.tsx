"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MentionText } from "@/components/notices/mention-text";

export type CommentItem = {
  id: string;
  notice_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author_name: string | null;
};

type TreeComment = CommentItem & { replies: TreeComment[] };

export function NoticeComments({
  noticeId,
  currentUserId,
  canDeleteAll,
}: {
  noticeId: string;
  currentUserId: string;
  canDeleteAll: boolean;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notices/${noticeId}/comments`);
      if (!res.ok) throw new Error("댓글을 불러올 수 없습니다.");
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [noticeId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/notices/${noticeId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: trimmed,
          parent_id: replyToId ?? undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "댓글 작성에 실패했습니다.");
      }
      setBody("");
      setReplyToId(null);
      await fetchComments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    try {
      const res = await fetch(
        `/api/notices/${noticeId}/comments/${commentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("삭제에 실패했습니다.");
      await fetchComments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  const buildTree = (list: CommentItem[], parentId: string | null): TreeComment[] => {
    return list
      .filter((c) => (c.parent_id ?? null) === parentId)
      .map((c) => ({
        ...c,
        replies: buildTree(list, c.id),
      }));
  };

  const tree: TreeComment[] = buildTree(comments, null);

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canDelete = (c: CommentItem) =>
    c.author_id === currentUserId || canDeleteAll;

  const renderComment = (c: TreeComment, depth: number) => (
    <div
      key={c.id}
      className={depth > 0 ? "ml-6 mt-2 border-l-2 border-muted pl-3" : "mt-3"}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-muted-foreground">
            {c.author_name ?? "알 수 없음"}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            {formatDate(c.created_at)}
          </span>
          <div className="mt-0.5 whitespace-pre-wrap text-sm">
            <MentionText text={c.body} />
          </div>
        </div>
        {canDelete(c) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-destructive hover:text-destructive"
            onClick={() => deleteComment(c.id)}
          >
            삭제
          </Button>
        )}
      </div>
      {depth === 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-auto p-0 text-xs text-muted-foreground"
          onClick={() => setReplyToId((prev) => (prev === c.id ? null : c.id))}
        >
          답글
        </Button>
      )}
      {c.replies.length > 0 &&
        c.replies.map((r) => renderComment(r, depth + 1))}
    </div>
  );

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="text-base">댓글 {comments.length}개</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="space-y-2">
          {replyToId && (
            <p className="text-xs text-muted-foreground">
              대댓글 작성 중 ·{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setReplyToId(null)}
              >
                취소
              </button>
            </p>
          )}
          <Textarea
            placeholder="댓글을 입력하세요. @이름 으로 멘션할 수 있습니다."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={submitting || !body.trim()}
          >
            {submitting ? "등록 중…" : "등록"}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">댓글 불러오는 중…</p>
        ) : tree.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 댓글이 없습니다.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {tree.map((c) => renderComment(c, 0))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
