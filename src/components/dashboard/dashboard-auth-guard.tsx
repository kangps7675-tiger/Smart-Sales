"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/client/store/useAuthStore";

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        로그인 페이지로 이동 중...
      </div>
    );
  }

  return <>{children}</>;
}
