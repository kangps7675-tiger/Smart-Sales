"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface NoticeDeleteButtonProps {
  noticeId: string;
}

export function NoticeDeleteButton({ noticeId }: NoticeDeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (loading) return;
    const ok = window.confirm("이 게시글을 삭제할까요?");
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch("/api/notices", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id: noticeId }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const message =
          (json && (json.error as string | undefined)) ||
          "게시글 삭제에 실패했습니다.";
        alert(message);
        return;
      }

      router.push("/dashboard/notices");
    } catch (error) {
      console.error("[Notices] 게시글 삭제 실패", error);
      alert("게시글 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors"
    >
      {loading ? "삭제 중..." : "삭제"}
    </Button>
  );
}

