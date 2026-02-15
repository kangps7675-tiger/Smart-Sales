"use client";

import { useRef, useEffect, useState } from "react";
import { TypingText } from "@/components/landing/typing-text";

const TO_CUSTOMER = "To 고객";
const CUSTOMER_DESC = "대기 시간을 줄이고, 가격을 투명하게 보여줘서 신뢰와 재방문을 이끌어냅니다.";
const CHAR_MS = 55;
const after = (chars: number) => chars * CHAR_MS + 400;

export function TypingOnScrollCustomer() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setInView(true);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {inView ? (
        <>
          <TypingText
            text={TO_CUSTOMER}
            delay={0}
            speed={CHAR_MS}
            as="h3"
            className="text-lg font-semibold uppercase tracking-wider text-foreground sm:text-xl"
          />
          <TypingText
            text={CUSTOMER_DESC}
            delay={after(TO_CUSTOMER.length)}
            speed={CHAR_MS}
            as="p"
            className="mt-2 text-base text-foreground sm:text-lg opacity-40"
          />
        </>
      ) : (
        <div className="min-h-[4.5rem]" aria-hidden />
      )}
    </div>
  );
}
