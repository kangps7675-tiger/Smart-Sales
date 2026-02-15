"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TypingTextProps {
  text: string;
  /** 시작 전 대기(ms) */
  delay?: number;
  /** 한 글자당 간격(ms) */
  speed?: number;
  className?: string;
  as?: "h2" | "h3" | "p" | "span";
  /** 타이핑 끝난 후 커서 숨기기 */
  hideCursorWhenDone?: boolean;
}

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
