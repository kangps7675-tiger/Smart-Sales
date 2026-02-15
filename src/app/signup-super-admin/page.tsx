"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/client/store/useAuthStore";
import { ThemeToggle } from "@/components/theme-toggle";

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

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError("");
    if (verifySuperAdminSignupPassword(key.trim())) {
      setStep("form");
    } else {
      setKeyError("가입 키가 올바르지 않습니다.");
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!name.trim() || !email.trim() || !loginId.trim()) {
      setSubmitError("이름, 이메일, 로그인 아이디를 모두 입력하세요.");
      return;
    }
    const success = signUpAsSuperAdmin(
      { name: name.trim(), email: email.trim(), loginId: loginId.trim() },
      key.trim()
    );
    if (success) {
      router.push("/dashboard");
    } else {
      setSubmitError("가입에 실패했습니다. 가입 키를 다시 확인하세요.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="text-xl">📱</span>
            <span>Smart Sales</span>
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
