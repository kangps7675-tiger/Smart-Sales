/**
 * 정책 관리 페이지 라우트
 * 
 * 역할:
 * - PolicyAdminPage 컴포넌트를 렌더링
 * - Next.js 라우트와 클라이언트 페이지 컴포넌트 연결
 * - 접근 권한 체크 및 리다이렉트
 * 
 * 접근 권한:
 * - super_admin: 접근·수정 가능 (본사 정책단가 입력, 지점에 즉시 반영)
 * - tenant_admin, staff: 접근 불가 (대시보드로 리다이렉트). 정책단가 수정은 슈퍼 어드민만 가능.
 * 
 * @file page.tsx
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/client/store/useAuthStore";
import PolicyAdminPage from "@/client/pages/PolicyAdminPage";

/**
 * 정책 관리 페이지 라우트 컴포넌트
 * 
 * Next.js 라우트 파일로, 클라이언트 컴포넌트인 PolicyAdminPage를 렌더링합니다.
 * 접근 권한을 체크하여 권한이 없는 사용자는 대시보드로 리다이렉트합니다.
 */
export default function PoliciesRoute() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  /**
   * 접근 권한: 정책단가 수정은 슈퍼 어드민만 가능. 지점(매장주·판매사)은 조회도 불가(메뉴 비노출).
   */
  useEffect(() => {
    if (user === null) {
      router.replace("/login");
      return;
    }
    if (user.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (!user || user.role !== "super_admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        접근 권한을 확인 중입니다...
      </div>
    );
  }

  return <PolicyAdminPage />;
}
