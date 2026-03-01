"use client";

/**
 * 전역 네비게이션 로딩 바
 *
 * - 내부 링크 클릭 시 즉시 상단 로딩 바 표시
 * - router.push 전에는 startNavigation() 호출 또는 'next-navigation-start' 이벤트로 표시
 * - 경로 변경 시 자동 숨김
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function isInternalLink(el: EventTarget | null): boolean {
  if (!el || !(el instanceof Node)) return false;
  const anchor = el instanceof HTMLAnchorElement ? el : (el as Element).closest?.("a");
  if (!anchor?.href || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  try {
    const url = new URL(anchor.href);
    return url.origin === (typeof window !== "undefined" ? window.location.origin : "");
  } catch {
    return false;
  }
}

export function NavigationLoading() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const handleStart = () => setIsNavigating(true);
    const handleCancel = () => setIsNavigating(false);
    const handleClick = (e: MouseEvent) => {
      if (isInternalLink(e.target)) setIsNavigating(true);
    };
    document.addEventListener("next-navigation-start", handleStart);
    document.addEventListener("next-navigation-cancel", handleCancel);
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("next-navigation-start", handleStart);
      document.removeEventListener("next-navigation-cancel", handleCancel);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  if (!isNavigating) return null;

  return (
    <div
      className="fixed left-0 top-0 z-[100] h-1 w-full overflow-hidden bg-primary/20"
      role="progressbar"
      aria-label="페이지 이동 중"
    >
      <div className="h-full w-1/3 animate-navigation-loading rounded-full bg-primary" />
    </div>
  );
}

/**
 * 프로그램 방식 이동 전에 호출하면 로딩 바가 즉시 표시됩니다.
 * 예: startNavigation(); router.push("/dashboard");
 */
export function startNavigation() {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new CustomEvent("next-navigation-start"));
}

/**
 * 이동을 취소할 때 호출 (예: 로그인 실패 시). 로딩 바를 숨깁니다.
 */
export function cancelNavigation() {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new CustomEvent("next-navigation-cancel"));
}
