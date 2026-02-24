/**
 * 대시보드 레이아웃 컴포넌트
 * 
 * 역할:
 * - 대시보드 라우트의 공통 레이아웃 제공
 * - 인증 가드 적용 (비로그인 사용자 차단)
 * - 대시보드 셸 적용 (네비게이션, 사이드바 등)
 * 
 * @file layout.tsx
 */

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardAuthGuard } from "@/components/dashboard/dashboard-auth-guard";

/**
 * 대시보드 레이아웃 컴포넌트
 * 
 * 모든 대시보드 페이지를 감싸는 레이아웃으로,
 * 인증 가드와 대시보드 셸을 적용합니다.
 * 
 * @param children - 대시보드 페이지 컴포넌트
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardAuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </DashboardAuthGuard>
  );
}
