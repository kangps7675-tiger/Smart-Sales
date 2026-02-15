"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore, ROLE_LABEL } from "@/client/store/useAuthStore";
import { getNavItemsForRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const nav = getNavItemsForRole(user?.role);

  return (
    <div className="flex min-h-screen flex-col bg-background sm:flex-row">
      <aside className="flex w-full flex-col border-b border-border/60 bg-sidebar sm:h-screen sm:w-56 sm:border-b-0 sm:border-r">
        <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4 sm:px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="text-lg">📱</span>
            <span className="hidden sm:inline">Smart Sales</span>
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
              {user.role && user.role !== "customer" && (
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
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
