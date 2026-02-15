"use client";

import { TypingText } from "@/components/landing/typing-text";
import { TypingOnScrollCustomer } from "@/components/landing/typing-on-scroll";
import { LandingFeatureCards } from "@/components/landing/landing-feature-cards";

const TITLE = "대리점과 방문 고객, 둘 다 만족시키는 기능";
const INTRO = "매장 운영을 가볍게 만들고, 상대하는 고객에게는 빠르고 투명한 경험을 드립니다.";
const TO_DEALER = "To 대리점";
const DEALER_DESC = "신입도 3분 만에 개통 입력을 끝낼 수 있게, 복잡한 정책과 정산을 한 곳에서 처리합니다.";

const CHAR_MS = 55;
const after = (chars: number) => chars * CHAR_MS + 400;

export function FeatureSectionHeaders() {
  return (
    <>
      <div className="text-center">
        <TypingText
          text={TITLE}
          delay={0}
          speed={CHAR_MS}
          as="h2"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        />
        <TypingText
          text={INTRO}
          delay={after(TITLE.length)}
          speed={CHAR_MS}
          as="p"
          className="mx-auto mt-3 max-w-xl text-base text-foreground sm:text-lg opacity-40"
        />
      </div>

      <div id="features-dealer" className="mt-16 scroll-mt-24 text-center">
        <TypingText
          text={TO_DEALER}
          delay={after(TITLE.length) + after(INTRO.length)}
          speed={CHAR_MS}
          as="h3"
          className="text-lg font-semibold uppercase tracking-wider text-foreground sm:text-xl"
        />
        <TypingText
          text={DEALER_DESC}
          delay={after(TITLE.length) + after(INTRO.length) + after(TO_DEALER.length)}
          speed={CHAR_MS}
          as="p"
          className="mt-2 text-base text-foreground sm:text-lg opacity-40"
        />
        <LandingFeatureCards type="dealer" />
      </div>

      <div id="features-customer" className="mt-20 border-t border-border/60 pt-16 scroll-mt-24 text-center">
        <TypingOnScrollCustomer />
        <LandingFeatureCards type="customer" />
      </div>
    </>
  );
}
