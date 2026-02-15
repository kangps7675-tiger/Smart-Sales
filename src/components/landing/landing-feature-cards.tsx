"use client";

import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { FeatureIllustration } from "@/components/landing/feature-card-illustrations";
import { cn } from "@/lib/utils";

const dealerCards = [
  { title: "스마트 견적기", items: ["모델 선택만 하면 출고가·공시지원금 자동 반영", "요금제별 월 납부금·할부·매장 마진 실시간 표시", "번호이동/기기변경·선택약정까지 한 화면에서 처리"] },
  { title: "고객 CRM", items: ["상담 → 예약 → 개통 → 사후관리 타임라인 관리", "유입 경로(당근·지인·워킹)별 통계로 마케팅 효과 확인", "연락처·이름만 넣으면 기존 상담 이력 조회 (연동 시)"] },
  { title: "자동 정산·판매 일보", items: ["견적 저장 시 판매 일보에 자동 반영, 엑셀 수기 입력 불필요", "판매 수수료·기기 마진·부가 리베이트 자동 계산", "일별·월별 집계로 본사 보고·정산 대응"] },
  { title: "정책·가격 한 곳에서", items: ["통신사별 요금제·지원금·할인 정책을 관리자가 직접 입력·수정", "단말 출고가·사은품 비용 등 복잡한 기준값 중앙 관리", "정책 변경 시 전 매장·전 직원이 동일 기준 적용"] },
  { title: "5단계 위저드로 실수 감소", items: ["20가지 항목을 기본정보 → 고객 → 기기/요금 → 할인/부가 → 정산으로 분리", "단계별 진행 표시로 누락·오입력 최소화", "신입 직원도 흐름만 따라가면 바로 활용 가능"] },
  { title: "다중 매장·직원 관리 (예정)", items: ["본사–대리점 구조, 매장별·직원별 실적·목표 관리", "권한 분리: 관리자(정책/일보) vs 판매(상담/계약)", "매장 간 데이터 공유 없이 각자 운영 가능"] },
];

const customerCards = [
  { title: "빠른 견적", body: "모델·요금제만 고르면 월 납부금·기기 비용이 바로 나와서, 고객이 오래 기다리지 않습니다. 상담사가 한 번에 입력하고 화면을 보여주기만 하면 됩니다." },
  { title: "투명한 가격", body: "월 납부금·선택 약정·부가요금·할인을 한 화면에 정리해서 보여줄 수 있어, 숨은 비용에 대한 불만을 줄이고 계약 전 이해를 도와줍니다." },
  { title: "정리된 계약 요약", body: "최종 정산 전에 요약 화면으로 확인이 가능해, 나중에 분쟁을 줄이고 신뢰를 쌓을 수 있습니다." },
  { title: "이어지는 상담", body: "한 번 입력한 고객 정보로 재방문 시 바로 이어서 상담할 수 있어, 고객은 다시 설명하지 않아도 되고 매장은 이탈을 줄일 수 있습니다." },
  { title: "단순한 선택", body: "번호이동/기기변경, 할인·부가 옵션을 단계별로 보여줘서 고객 부담을 덜고, 상담사는 설명에만 집중할 수 있습니다." },
  { title: "일관된 서비스 품질", body: "정책과 견적 로직이 시스템에 맞춰져 있어, 누가 상담하든 동일한 기준으로 안내할 수 있고 고객은 일관된 경험을 갖게 됩니다." },
];

function CardDealer({ title, items, index }: { title: string; items: string[]; index: number }) {
  return (
    <ScrollReveal delayMs={index * 80}>
      <div className={cn("group relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30")}>
        <FeatureIllustration type="dealer" index={index} />
        <div className="relative border-t border-border/50 p-6 text-center">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
          <h4 className="mt-1 text-lg font-semibold text-foreground sm:text-xl">{title}</h4>
          <ul className="mx-auto mt-3 max-w-lg list-none space-y-1.5 text-sm text-foreground/85">
            {items.map((item, i) => (
              <li key={i} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </ScrollReveal>
  );
}

function CardCustomer({ title, body, index }: { title: string; body: string; index: number }) {
  return (
    <ScrollReveal delayMs={index * 80}>
      <div className={cn("group relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30")}>
        <FeatureIllustration type="customer" index={index} />
        <div className="relative border-t border-border/50 p-6 text-center">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
          <h4 className="mt-1 text-lg font-semibold text-foreground sm:text-xl">{title}</h4>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-foreground/85">{body}</p>
        </div>
      </div>
    </ScrollReveal>
  );
}

export function LandingFeatureCards({ type }: { type: "dealer" | "customer" }) {
  const spacer = "min-h-[82vh] flex items-center justify-center";
  if (type === "dealer") {
    return (
      <div className="mt-6 flex flex-col">
        {dealerCards.map((card, i) => (
          <div key={card.title} className={spacer}>
            <div className="w-full max-w-2xl overflow-hidden px-4">
              <CardDealer title={card.title} items={card.items} index={i} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col">
      {customerCards.map((card, i) => (
        <div key={card.title} className={spacer}>
          <div className="w-full max-w-2xl overflow-hidden px-4">
            <CardCustomer title={card.title} body={card.body} index={i} />
          </div>
        </div>
      ))}
    </div>
  );
}
