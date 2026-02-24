/**
 * 랜딩 페이지 (Landing Page)
 *
 * 역할:
 * - 직원용 SaaS 소개 및 주요 기능 안내 (매장주·판매사·본사)
 * - 매장주 가입 및 로그인 유도
 * - 다크 모드 지원
 *
 * 디자인:
 * - Notion/Linear 스타일의 미니멀한 레이아웃
 * - 심플한 히어로 섹션 + 기능 카드
 *
 * @file page.tsx
 */

import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
const logoFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: "600",
});

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
      {/* 상단 네비게이션 */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
            <span className={`text-lg ${logoFont.className}`}>Smart Sales</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                로그인
              </Button>
            </Link>
            <Link href="/login?tab=tenant_signup">
              <Button size="sm">시작하기</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="border-b border-border/40 bg-gradient-to-b from-background to-muted/40 px-4 py-24 sm:py-32 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            휴대폰 매장 운영, 한 화면에서 정리 끝.
          </h1>
          <p className="mt-6 text-sm text-muted-foreground sm:text-base">
            판매일보, 직원·매장 관리, 급여 계산, 정책 단가까지.
            <br className="hidden sm:inline" />
            엑셀 없이도 매일의 숫자를 안전하게 정리해 드립니다.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <Link href="/login?tab=tenant_signup">
              <Button size="lg" className="min-w-[190px]">
                지금 시작하기
              </Button>
            </Link>
            <span className="text-xs text-muted-foreground sm:text-sm">
              설치 없이 바로 웹에서 사용 · 매장주/직원 전용
            </span>
          </div>
        </div>
      </section>

      {/* 기능 소개 섹션 */}
      <section id="features" className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl space-y-12">
          <div className="space-y-3 text-center">
            <p className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              매장 운영에 꼭 필요한 기능만
            </p>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              판매 데이터부터 급여까지, 흐름대로 이어집니다.
            </h2>
            <p className="text-sm text-muted-foreground">
              복잡한 화면 대신, 매일 자주 쓰는 네 가지 기능에 집중했습니다.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-lg">
                📊
              </div>
              <h3 className="text-sm font-semibold text-foreground">판매 일보 자동 집계</h3>
              <p className="text-xs text-muted-foreground">
                엑셀 업로드 한 번으로 일일·월간 실적이 자동으로 정리됩니다. 중복 업로드도 안전하게 차단합니다.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-lg">
                👥
              </div>
              <h3 className="text-sm font-semibold text-foreground">직원·고객 관리</h3>
              <p className="text-xs text-muted-foreground">
                매장별 판매사와 고객 이력을 한 화면에서 조회하고, 재방문·업셀링 기회를 놓치지 않습니다.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-lg">
                💰
              </div>
              <h3 className="text-sm font-semibold text-foreground">급여·인센티브 계산</h3>
              <p className="text-xs text-muted-foreground">
                판매일보를 기반으로 판매사별 건수·마진·지원금을 합산해 인센티브를 자동 계산합니다.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-lg">
                ⚙️
              </div>
              <h3 className="text-sm font-semibold text-foreground">정책·단가 관리</h3>
              <p className="text-xs text-muted-foreground">
                본사 정책 단가와 요금제 정보를 한 번만 입력하면, 견적과 마진 계산에 자동 반영됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-border/60 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <span className={`text-sm font-medium text-foreground ${logoFont.className}`}>Smart Sales</span>
          <p>© 휴대폰 매장 직원용 통합 관리 SaaS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
