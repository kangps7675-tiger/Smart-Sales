/**
 * 고객 초대 경로 (미사용)
 *
 * 이 서비스는 직원용 SaaS입니다. 매장주·판매사·본사만 가입·로그인하며,
 * 고객(일반 소비자) 초대 기능은 제공하지 않습니다.
 * 대시보드로 리다이렉트합니다.
 *
 * @file page.tsx
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerInviteRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      대시보드로 이동 중...
    </div>
  );
}
