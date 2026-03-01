/**
 * 슈퍼 어드민 가입 페이지
 * 
 * 역할:
 * - 슈퍼 어드민 계정 생성
 * - 가입 키 검증 후 가입 진행
 * 
 * 보안:
 * - 가입 키 검증 필수
 * - 가입 키는 useAuthStore에서 관리
 * 
 * @file page.tsx
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startNavigation } from "@/components/navigation-loading";
import { Cormorant_Garamond } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/client/store/useAuthStore";
import { ThemeToggle } from "@/components/theme-toggle";
import { validatePassword } from "@/lib/password-validation";

const logoFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: "600",
});

/**
 * 슈퍼 어드민 가입 페이지 컴포넌트
 * 
 * 2단계 가입 프로세스:
 * 1. 가입 키 입력 및 검증
 * 2. 관리자 정보 입력 및 가입 완료
 */
export default function SignupSuperAdminPage() {
  const router = useRouter();
  const verifySuperAdminSignupPassword = useAuthStore((s) => s.verifySuperAdminSignupPassword);
  const signUpAsSuperAdmin = useAuthStore((s) => s.signUpAsSuperAdmin);

  const [step, setStep] = useState<"key" | "form">("key");
  const [key, setKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loginId, setLoginId] = useState("");
  const [submitError, setSubmitError] = useState("");

  /**
   * 가입 키 검증 핸들러
   * 
   * 입력된 가입 키가 올바른지 검증하고,
   * 성공 시 다음 단계(정보 입력)로 진행합니다.
   */
  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError("");
    const pwdCheck = validatePassword(key.trim());
    if (!pwdCheck.valid) {
      setKeyError(pwdCheck.message ?? "가입 키는 8자 이상, 특수문자를 포함해야 합니다.");
      return;
    }
    if (verifySuperAdminSignupPassword(key.trim())) {
      setStep("form");
    } else {
      setKeyError("가입 키가 올바르지 않습니다.");
    }
  };

  /**
   * 슈퍼 어드민 가입 처리 핸들러
   * 
   * 입력된 정보로 슈퍼 어드민 계정을 생성하고,
   * 성공 시 대시보드로 이동합니다.
   */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    const pwdCheck = validatePassword(key.trim());
    if (!pwdCheck.valid) {
      setSubmitError(pwdCheck.message ?? "가입 키는 8자 이상, 특수문자를 포함해야 합니다.");
      return;
    }
    if (!name.trim() || !email.trim() || !loginId.trim()) {
      setSubmitError("이름, 이메일, 로그인 아이디를 모두 입력하세요.");
      return;
    }
    const result = await signUpAsSuperAdmin(
      {
        name: name.trim(),
        email: email.trim(),
        loginId: loginId.trim(),
        storeGroupId: null,
      },
      key.trim(),
    );
    if (result.success) {
      startNavigation();
      router.push("/dashboard");
    } else {
      setSubmitError(result.error ?? "가입에 실패했습니다. 가입 키를 다시 확인하세요.");
    }
  };

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="text-xl">📱</span>
            <span className={`text-2xl ${logoFont.className}`}>Smart Sales</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-12 sm:py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">슈퍼 어드민 가입</CardTitle>
            <CardDescription>
              {step === "key"
                ? "시스템 전체를 관리할 슈퍼 어드민 계정을 만듭니다. 가입 키를 입력하세요."
                : "관리자 계정 정보를 입력하세요. 가입 후 로그인된 상태로 대시보드로 이동합니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === "key" ? (
              <form onSubmit={handleKeySubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="key" className="text-sm font-medium text-foreground">
                    가입 키
                  </label>
                  <Input
                    id="key"
                    type="password"
                    placeholder="가입 키 입력"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    autoComplete="off"
                  />
                  {keyError && <p className="text-sm text-destructive">{keyError}</p>}
                </div>
                <Button type="submit" className="w-full" size="lg">
                  다음
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">이름</label>
                  <Input
                    type="text"
                    placeholder="관리자 이름"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">이메일</label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">로그인 아이디</label>
                  <Input
                    type="text"
                    placeholder="로그인 시 사용할 아이디"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    autoComplete="username"
                  />
                </div>
                {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep("key")}>
                    이전
                  </Button>
                  <Button type="submit" className="flex-1" size="lg">
                    슈퍼 어드민으로 가입
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline hover:text-foreground">
            로그인 페이지로 돌아가기
          </Link>
        </p>
      </main>
    </div>
  );
}
