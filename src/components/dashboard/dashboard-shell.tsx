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
import { usePathname, useRouter } from "next/navigation";
import { Cormorant_Garamond } from "next/font/google";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore, ROLE_LABEL } from "@/client/store/useAuthStore";
import { getNavItemsForRole, type NavGroup } from "@/lib/rbac";
import { startNavigation } from "@/components/navigation-loading";
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
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const nav = getNavItemsForRole(user?.role);

  const handleLogout = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      logout();
      startNavigation();
      router.push("/login");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background sm:flex-row" suppressHydrationWarning>
      <aside className="flex w-full flex-col border-b border-border/60 bg-sidebar sm:sticky sm:top-0 sm:h-screen sm:w-56 sm:border-b-0 sm:border-r">
        <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4 sm:px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="text-lg">📱</span>
            <span className={`hidden sm:inline text-lg ${logoFont.className}`}>Smart Sales</span>
          </Link>
        </div>
        <nav className="flex min-h-0 flex-1 flex-row gap-1 overflow-x-auto p-2 sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto">
          {(() => {
            const groupStyle: Record<NavGroup, { active: string; idle: string; border: string; label: string }> = {
              dashboard: {
                active: "bg-slate-200/70 text-slate-800 dark:bg-slate-700/50 dark:text-slate-100",
                idle: "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200",
                border: "border-l-slate-400 dark:border-l-slate-500",
                label: "",
              },
              core: {
                active: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
                idle: "text-sidebar-foreground hover:bg-blue-50/60 hover:text-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-300",
                border: "border-l-blue-500 dark:border-l-blue-400",
                label: "핵심",
              },
              extra: {
                active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
                idle: "text-sidebar-foreground hover:bg-emerald-50/60 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300",
                border: "border-l-emerald-500 dark:border-l-emerald-400",
                label: "부가",
              },
              settings: {
                active: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                idle: "text-sidebar-foreground hover:bg-amber-50/60 hover:text-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-300",
                border: "border-l-amber-500 dark:border-l-amber-400",
                label: "설정",
              },
            };
            let lastGroup: NavGroup | null = null;
            return nav.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const style = groupStyle[item.group];
              const showDivider = lastGroup !== null && lastGroup !== item.group;
              lastGroup = item.group;
              return (
                <div key={item.href} className="shrink-0">
                  {showDivider && (
                    <div className="my-1.5 hidden items-center gap-2 sm:flex">
                      <div className="flex-1 border-t border-border/40" />
                      {style.label && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{style.label}</span>
                      )}
                      <div className="flex-1 border-t border-border/40" />
                    </div>
                  )}
                  <Link
                    href={item.href}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border-l-2 sm:border-l-2",
                      isActive
                        ? `${style.active} ${style.border}`
                        : `border-l-transparent ${style.idle}`
                    )}
                    style={{ display: "block" }}
                  >
                    {item.label}
                  </Link>
                </div>
              );
            });
          })()}
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
            onClick={handleLogout}
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
