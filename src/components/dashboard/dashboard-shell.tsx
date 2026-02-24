/**
 * 대시보드 셸 컴포넌트
 * 
 * 역할:
 * - 대시보드의 공통 레이아웃 제공 (사이드바, 헤더)
 * - 역할 기반 네비게이션 메뉴 표시
 * - 사용자 정보 및 로그아웃 버튼 표시
 * - 테마 토글 버튼 제공
 * 
 * @file dashboard-shell.tsx
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cormorant_Garamond } from "next/font/google";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore, ROLE_LABEL } from "@/client/store/useAuthStore";
import { getNavItemsForRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const logoFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: "600",
});

/**
 * 대시보드 셸 컴포넌트
 * 
 * 대시보드의 공통 UI 구조를 제공합니다:
 * - 좌측 사이드바: 로고, 네비게이션 메뉴
 * - 상단 헤더: 사용자 정보, 테마 토글, 로그아웃 버튼
 * - 메인 콘텐츠 영역: children 렌더링
 * 
 * @param children - 대시보드 페이지 콘텐츠
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const nav = getNavItemsForRole(user?.role);

  return (
    <div className="flex min-h-screen flex-col bg-background sm:flex-row" suppressHydrationWarning>
      <aside className="flex w-full flex-col border-b border-border/60 bg-sidebar sm:h-screen sm:w-56 sm:border-b-0 sm:border-r">
        <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4 sm:px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="text-lg">📱</span>
            <span className={`hidden sm:inline text-lg ${logoFont.className}`}>Smart Sales</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-row gap-1 p-2 sm:flex-col">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  ? "bg-sidebar-accent text-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b border-border/60 bg-card/80 px-4 backdrop-blur-sm sm:px-6">
          {user && (
            <span className="text-sm text-muted-foreground">
              {user.name}
              {user.role && (
                <span className="ml-1 rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                  {ROLE_LABEL[user.role]}
                </span>
              )}
            </span>
          )}
          <ThemeToggle />
          <Link
            href="/login"
            onClick={() => logout()}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            로그아웃
          </Link>
        </header>
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
