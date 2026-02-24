/**
 * 타이핑 애니메이션 텍스트 컴포넌트
 * 
 * 역할:
 * - 텍스트를 한 글자씩 타이핑하는 효과 제공
 * - 랜딩 페이지의 동적 효과에 사용
 * 
 * 특징:
 * - 시작 전 대기 시간 설정 가능
 * - 타이핑 속도 조절 가능
 * - 타이핑 완료 후 커서 숨김 옵션
 * 
 * @file typing-text.tsx
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * TypingText 컴포넌트 Props
 */
interface TypingTextProps {
  text: string;              // 타이핑할 텍스트
  /** 시작 전 대기(ms) */
  delay?: number;           // 시작 전 대기 시간 (기본값: 0)
  /** 한 글자당 간격(ms) */
  speed?: number;           // 한 글자당 타이핑 속도 (기본값: 50ms)
  className?: string;       // 추가 CSS 클래스
  as?: "h2" | "h3" | "p" | "span"; // 렌더링할 HTML 태그
  /** 타이핑 끝난 후 커서 숨기기 */
  hideCursorWhenDone?: boolean; // 완료 후 커서 숨김 여부 (기본값: true)
}

/**
 * 타이핑 애니메이션 텍스트 컴포넌트
 * 
 * 텍스트를 한 글자씩 타이핑하는 효과를 제공합니다.
 * 랜딩 페이지의 동적 효과에 사용됩니다.
 */
export function TypingText({
  text,
  delay = 0,
  speed = 50,
  className,
  as: Tag = "span",
  hideCursorWhenDone = true,
}: TypingTextProps) {
  const [length, setLength] = useState(0);
  const [started, setStarted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || text.length === 0) return;
    const startTimer = window.setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [mounted, delay, text.length]);

  useEffect(() => {
    if (!started || length >= text.length) return;
    const t = window.setTimeout(() => setLength((n) => n + 1), speed);
    return () => clearTimeout(t);
  }, [started, length, text.length, speed]);

  const done = length >= text.length;
  const showCursor = mounted && (!hideCursorWhenDone || !done);

  return (
    <Tag className={cn(className)}>
      {text.slice(0, length)}
      {showCursor && (
        <span
          className="inline-block w-0.5 animate-typing-cursor bg-current align-middle"
          aria-hidden
        />
      )}
    </Tag>
  );
}
