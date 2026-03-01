"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/client/store/useAuthStore";

export function NoticeEditLink({
  noticeId,
  authorId,
  type,
}: {
  noticeId: string;
  authorId: string | null;
  type: string;
}) {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  const role = user.role;
  const isOwner = authorId === user.id;
  const isNotice = type === "notice" || !type;

  // 수정 권한:
  // - super_admin: 모든 공지/글 수정 가능
  // - region_manager / tenant_admin:
  //   - notice/post 모두 자기 글만 수정 가능
  // - staff:
  //   - post만 자기 글 수정 가능 (notice 수정 불가)
  let canEdit = false;
  if (role === "super_admin") {
    canEdit = true;
  } else if (role === "region_manager" || role === "tenant_admin") {
    canEdit = isOwner;
  } else if (role === "staff") {
    canEdit = isOwner && !isNotice;
  }

  if (!canEdit) return null;

  return (
    <Link href={`/dashboard/notices/${noticeId}/edit`}>
      <Button variant="outline" size="sm">
        수정
      </Button>
    </Link>
  );
}
