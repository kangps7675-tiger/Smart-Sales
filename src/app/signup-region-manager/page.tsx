"use client";

/**
 * 지점장(region_manager) 가입 페이지
 *
 * 역할:
 * - 지점/브랜드/법인 단위 그룹(store_group) 생성
 * - 해당 그룹을 관리하는 지점장(region_manager) 계정 생성
 *
 * 보안:
 * - REGION_MANAGER_SIGNUP_PASSWORD 환경변수 기반 가입 키 검증
 *
 * @file page.tsx
 */

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

type Step = "key" | "form";

export default function SignupRegionManagerPage() {
  const router = useRouter();
  const signUpAsRegionManager = useAuthStore((s) => s.signUpAsRegionManager);

  const [step, setStep] = useState<Step>("key");
  const [key, setKey] = useState("");
  const [keyError, setKeyError] = useState("");

  const [storeGroupName, setStoreGroupName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitError, setSubmitError] = useState("");

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError("");
    const trimmed = key.trim();
    const pwdCheck = validatePassword(trimmed);
    if (!pwdCheck.valid) {
      setKeyError(pwdCheck.message ?? "가입 키는 8자 이상, 특수문자를 포함해야 합니다.");
      return;
    }
    // 실제 유효성은 백엔드에서 REGION_MANAGER_SIGNUP_PASSWORD로 검증
    setStep("form");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!storeGroupName.trim() || !name.trim() || !email.trim() || !loginId.trim() || !password) {
      setSubmitError("지점/회사명, 이름, 이메일, 로그인 아이디, 비밀번호를 모두 입력하세요.");
      return;
    }

    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      setSubmitError(pwdCheck.message ?? "비밀번호 규칙을 확인하세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setSubmitError("비밀번호가 일치하지 않습니다.");
      return;
    }

    const result = await signUpAsRegionManager(
      storeGroupName.trim(),
      {
        name: name.trim(),
        email: email.trim(),
        loginId: loginId.trim(),
        storeGroupId: null,
      },
      password,
      key.trim(),
    );

    if (result.success) {
      startNavigation();
      router.push("/dashboard");
    } else {
      setSubmitError(result.error ?? "지점장 가입에 실패했습니다. 가입 키와 정보를 다시 확인하세요.");
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
            <CardTitle className="text-xl">지점장(법인/브랜드) 가입</CardTitle>
            <CardDescription>
              {step === "key"
                ? "여러 매장을 관리할 지점/브랜드 관리 계정을 만듭니다. 가입 키를 입력하세요."
                : "지점/회사 정보와 관리자 계정을 입력하세요. 가입 후 로그인된 상태로 대시보드로 이동합니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === "key" ? (
              <form onSubmit={handleKeySubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="key" className="text-sm font-medium text-foreground">
                    지점장 가입 키
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
                <Button type="submit" className="w-full">
                  다음 단계로
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  이 화면은 본사에서 전달받은 지점장용 가입 키가 있는 경우에만 사용하세요.
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="storeGroupName" className="text-sm font-medium text-foreground">
                    지점/회사명
                  </label>
                  <Input
                    id="storeGroupName"
                    placeholder="예: A통신 강남지점, OO휴대폰 법인 등"
                    value={storeGroupName}
                    onChange={(e) => setStoreGroupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-foreground">
                    담당자 이름
                  </label>
                  <Input
                    id="name"
                    placeholder="이름"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    이메일
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="loginId" className="text-sm font-medium text-foreground">
                    로그인 아이디
                  </label>
                  <Input
                    id="loginId"
                    placeholder="로그인에 사용할 아이디"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    비밀번호
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="passwordConfirm" className="text-sm font-medium text-foreground">
                    비밀번호 확인
                  </label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    placeholder="비밀번호 확인"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                  />
                </div>
                {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                <Button type="submit" className="w-full">
                  지점장 계정 만들기
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="underline">
            로그인으로 이동
          </Link>
        </p>
      </main>
    </div>
  );
}

