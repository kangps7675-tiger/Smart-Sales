import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { FeaturesNavDropdown } from "@/components/landing/features-nav-dropdown";
import { FeatureSectionHeaders } from "@/components/landing/feature-section-headers";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
            Smart Sales
          </Link>
          <div className="flex items-center gap-3">
            <FeaturesNavDropdown />
            <a href="#pricing" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-block">
              요금제
            </a>
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                로그인
              </Button>
            </Link>
            <Link href="/login?tab=tenant_signup">
              <Button size="sm">매장주로 시작하기</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="border-b border-border/40 px-4 py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            엑셀 수동 입력 0분,
            <br />
            <span className="text-primary">정산 실수 0건.</span>
          </h1>
          <p className="mt-5 text-base text-muted-foreground sm:text-lg">
            견적·계약·판매 일보를 한 곳에서.
            <br />
            휴대폰 대리점을 위한 B2B SaaS.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/login?tab=tenant_signup">
              <Button size="lg" className="min-w-[180px]">
                매장주로 시작하기
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="min-w-[180px]">
                로그인
              </Button>
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            판매사(직원)는 매장주가 발급한 <strong className="font-medium text-foreground">초대 코드</strong>로 가입하세요.
          </p>
        </div>
      </section>

      <section id="features" className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <FeatureSectionHeaders />
        </div>
      </section>

      <section className="border-t border-border/60 px-4 py-10">
        <p className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
          보안 및 데이터 백업으로 고객 명부를 안전하게 보관합니다.
        </p>
      </section>
      <section id="pricing" className="border-t border-border/60 bg-muted/30 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            단순한 요금, 명확한 가치
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            월 구독형으로 부담 없이 시작하세요. (요금제 상세는 준비 중)
          </p>
        </div>
      </section>

      <footer className="border-t border-border/60 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-sm font-medium text-foreground">Smart Sales</span>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">서비스 약관</a>
            <a href="#" className="hover:text-foreground">개인정보처리방침</a>
            <a href="#" className="hover:text-foreground">고객 센터</a>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-5xl text-center text-xs text-muted-foreground">
          © 휴대폰 매장 통합 관리 SaaS. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
