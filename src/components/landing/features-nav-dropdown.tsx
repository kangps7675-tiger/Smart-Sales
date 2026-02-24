/**
 * 기능 네비게이션 드롭다운 컴포넌트
 * 
 * 역할:
 * - 랜딩 페이지 네비게이션 바의 기능 메뉴 드롭다운
 * - 대리점/고객 기능 섹션으로 이동하는 링크 제공
 * 
 * @file features-nav-dropdown.tsx
 */

"use client";

import { useState, useRef, useEffect } from "react";

/**
 * 드롭다운 메뉴 항목 목록
 */
const items = [
  { label: "To 대리점", href: "#features-dealer" },
  { label: "To 고객", href: "#features-customer" },
];

/**
 * 기능 네비게이션 드롭다운 컴포넌트
 * 
 * 클릭 시 드롭다운 메뉴가 열리고,
 * 외부 클릭 시 자동으로 닫힙니다.
 */
export function FeaturesNavDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /**
   * 외부 클릭 감지
   * 
   * 드롭다운 외부를 클릭하면 자동으로 닫힙니다.
   */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="true"
      >
        기능
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-md border border-border bg-card py-1 shadow-md">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
