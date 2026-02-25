"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/client/store/useAuthStore";

export function NoticeEditLink({ noticeId }: { noticeId: string }) {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== "super_admin") return null;
  return (
    <Link href={`/dashboard/notices/${noticeId}/edit`}>
      <Button variant="outline" size="sm">
        수정
      </Button>
    </Link>
  );
}
