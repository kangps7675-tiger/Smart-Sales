/**
 * 테마 토글 컴포넌트
 * 
 * 역할:
 * - 다크 모드 / 라이트 모드 전환 버튼 제공
 * - 현재 테마에 따라 아이콘 표시 (태양/달)
 * - 하이드레이션 완료 전 깜빡임 방지
 * 
 * @file theme-toggle.tsx
 */

"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * 테마 토글 컴포넌트
 * 
 * 다크 모드와 라이트 모드를 전환하는 버튼을 제공합니다.
 * 클릭 시 현재 테마의 반대 모드로 전환됩니다.
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  /**
   * 하이드레이션 완료 플래그 설정
   * 서버와 클라이언트 간 불일치로 인한 깜빡임 방지
   */
  useEffect(() => setMounted(true), []);

  /**
   * 하이드레이션 완료 전에는 빈 버튼 표시
   * (테마 정보가 아직 로드되지 않았을 때)
   */
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" aria-hidden>
        <span className="h-4 w-4" />
      </Button>
    );
  }

  // 현재 테마 확인 (다크 모드 여부)
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </Button>
  );
}
