/**
 * 대시보드 인증 가드 컴포넌트
 * 
 * 역할:
 * - 대시보드 페이지 접근 시 인증 상태 확인
 * - 비로그인 사용자는 로그인 페이지로 리다이렉트
 * - localStorage hydration 완료 전 로딩 화면 표시 (깜빡임 방지)
 * 
 * 동작:
 * 1. localStorage에서 인증 상태 복원 대기 (hydration)
 * 2. hydration 완료 후 사용자 확인
 * 3. 사용자가 없으면 로그인 페이지로 리다이렉트
 * 4. 사용자가 있으면 children 렌더링
 * 
 * @file dashboard-auth-guard.tsx
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/client/store/useAuthStore";

/**
 * 대시보드 인증 가드 컴포넌트
 * 
 * 대시보드 라우트를 보호하며, 인증되지 않은 사용자의 접근을 차단합니다.
 * 
 * @param children - 인증된 사용자에게만 표시할 컴포넌트
 */
export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated); // localStorage 복원 완료 여부
  const router = useRouter();

  useEffect(() => {
    // Hydration이 완료된 후에만 리다이렉트 체크
    // hydration 전에 체크하면 localStorage에서 복원 중인 사용자를 로그아웃시킬 수 있음
    if (hasHydrated && user === null) {
      router.replace("/login");
    }
  }, [user, hasHydrated, router]);

  // Hydration이 완료되지 않았으면 로딩 화면 표시
  // 이렇게 하면 새로고침 시 로그인 화면이 잠깐 보이는 깜빡임을 방지할 수 있습니다.
  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="text-center">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Hydration 완료 후 사용자가 없으면 리다이렉트 중 메시지
  // (useEffect에서 리다이렉트가 실행되는 동안 표시)
  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        로그인 페이지로 이동 중...
      </div>
    );
  }

  // 인증된 사용자에게만 children 렌더링
  return <>{children}</>;
}
