/**
 * 로그인 및 회원가입 페이지
 *
 * 역할:
 * - 아이디/비밀번호 로그인
 * - 매장주 회원가입 (매장 생성 후 사장님 계정)
 * - 판매사 가입: 매장주가 발급한 매장키(초대 코드)로만 가입 (소셜 로그인 없음)
 *
 * 탭 구성:
 * - login: 로그인
 * - tenant_signup: 매장주 가입
 * - invite_signup: 판매사 가입 (매장키 입력)
 *
 * @file page.tsx
 */

"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { startNavigation, cancelNavigation } from "@/components/navigation-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/client/store/useAuthStore";
import { ThemeToggle } from "@/components/theme-toggle";
import { validatePassword } from "@/lib/password-validation";
import { cn } from "@/lib/utils";

const logoFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: "600",
});

/**
 * 사용 가능한 탭 ID 목록
 * 
 * 직원용: 매장주·판매사만 가입/로그인 (고객 가입·소셜 로그인 없음).
 */
const TAB_IDS = ["login", "tenant_signup", "invite_signup", "reset_password"] as const;
type Tab = (typeof TAB_IDS)[number];

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const signUpAsTenantAdmin = useAuthStore((s) => s.signUpAsTenantAdmin);
  const signUpWithInvite = useAuthStore((s) => s.signUpWithInvite);

  const tabFromUrl = searchParams.get("tab") as Tab | null;
  const tokenFromUrl = searchParams.get("token") ?? "";
  const [tab, setTab] = useState<Tab>("login");

  useEffect(() => {
    if (tabFromUrl === "reset_password" && tokenFromUrl) {
      setTab("reset_password");
      return;
    }
    if (tabFromUrl && TAB_IDS.includes(tabFromUrl)) {
      setTab(tabFromUrl);
    }
  }, [tabFromUrl, tokenFromUrl]);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [autoLogin, setAutoLogin] = useState(true);

  const [showForgotForm, setShowForgotForm] = useState(false);
  const [forgotLoginId, setForgotLoginId] = useState("");
  const [forgotMessage, setForgotMessage] = useState<{ type: "link" | "error"; text: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [shopName, setShopName] = useState("");
  const [signName, setSignName] = useState("");
  const [signEmail, setSignEmail] = useState("");
  const [signLoginId, setSignLoginId] = useState("");
  const [signPassword, setSignPassword] = useState("");
  const [signPasswordConfirm, setSignPasswordConfirm] = useState("");

  const [inviteCode, setInviteCode] = useState("");
  const [inviteCodeValid, setInviteCodeValid] = useState<boolean | null>(null);
  const [inviteSignName, setInviteSignName] = useState("");
  const [inviteSignEmail, setInviteSignEmail] = useState("");
  const [inviteSignLoginId, setInviteSignLoginId] = useState("");
  const [inviteSignPassword, setInviteSignPassword] = useState("");
  const [inviteSignPasswordConfirm, setInviteSignPasswordConfirm] = useState("");
  const [inviteError, setInviteError] = useState("");

  /**
   * 판매사 초대 코드 유효성 검증
   * 
   * 입력된 초대 코드가 존재하고 만료되지 않았는지 확인합니다.
   */
  const checkInviteCode = () => {
    const { invites } = useAuthStore.getState();
    const code = inviteCode.trim().toUpperCase();
    const valid = invites.some(
      (i) => i.code.toUpperCase() === code && new Date(i.expiresAt) > new Date()
    );
    setInviteCodeValid(valid);
  };

  /**
   * 로그인 처리 핸들러
   * 
   * 로그인 ID와 비밀번호로 /api/auth/login을 호출하고,
   * 성공 시 대시보드로 이동합니다.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) return;
    startNavigation();
    const result = await login(loginId.trim(), password, autoLogin);
    if (result.success) {
      router.push("/dashboard");
    } else {
      cancelNavigation();
      if (result.error) alert(result.error);
    }
  };

  /**
   * 매장주 회원가입 처리 핸들러
   * 
   * 매장명과 사용자 정보를 입력받아 매장주 계정을 생성합니다.
   * 비밀번호 확인이 일치해야 가입이 완료됩니다.
   */
  const handleTenantSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !signName.trim() || !signEmail.trim() || !signLoginId.trim() || !signPassword) return;
    const pwdCheck = validatePassword(signPassword);
    if (!pwdCheck.valid) {
      alert(pwdCheck.message ?? "비밀번호 규칙을 확인하세요.");
      return;
    }
    if (signPassword !== signPasswordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    const result = await signUpAsTenantAdmin(
      shopName.trim(),
      {
        name: signName.trim(),
        email: signEmail.trim(),
        loginId: signLoginId.trim(),
      },
      signPassword
    );
    if (result.success) {
      startNavigation();
      router.push("/dashboard");
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = forgotLoginId.trim();
    if (!id) return;
    setForgotMessage(null);
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setForgotMessage({ type: "error", text: data?.error ?? "재설정 링크 생성에 실패했습니다." });
        return;
      }
      const link = data.reset_link ?? "";
      const fullLink = link.startsWith("http") ? link : `${typeof window !== "undefined" ? window.location.origin : ""}${link}`;
      setForgotMessage({
        type: "link",
        text: fullLink,
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") ?? tokenFromUrl : tokenFromUrl;
    if (!token) {
      setResetError("재설정 링크가 올바르지 않습니다.");
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setResetError("비밀번호가 일치하지 않습니다.");
      return;
    }
    const pwdCheck = validatePassword(resetPassword);
    if (!pwdCheck.valid) {
      setResetError(pwdCheck.message ?? "비밀번호 규칙을 확인하세요.");
      return;
    }
    setResetError("");
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: resetPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetError(data?.error ?? "비밀번호 변경에 실패했습니다.");
        return;
      }
      setResetSuccess(true);
    } finally {
      setResetLoading(false);
    }
  };

  const handleInviteSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    const pwdCheck = validatePassword(inviteSignPassword);
    if (!pwdCheck.valid) {
      setInviteError(pwdCheck.message ?? "비밀번호 규칙을 확인하세요.");
      return;
    }
    if (inviteSignPassword !== inviteSignPasswordConfirm) {
      setInviteError("비밀번호가 일치하지 않습니다.");
      return;
    }
    const result = await signUpWithInvite(
      inviteCode.trim(),
      {
        name: inviteSignName.trim(),
        email: inviteSignEmail.trim(),
        loginId: inviteSignLoginId.trim(),
      },
      inviteSignPassword
    );
    if (result.success) {
      startNavigation();
      router.push("/dashboard");
    } else setInviteError(result.error ?? "가입에 실패했습니다.");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "login" as const, label: "로그인" },
    { id: "tenant_signup" as const, label: "매장주 가입" },
    { id: "invite_signup" as const, label: "판매사 가입" },
  ];

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

      <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
        <Card>
          <CardHeader className="space-y-1 pb-4">
            <div className="flex rounded-lg bg-muted p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                    tab === t.id ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <CardTitle className="text-xl">
              {tab === "login" && !showForgotForm && "로그인"}
              {tab === "login" && showForgotForm && "비밀번호 찾기"}
              {tab === "tenant_signup" && "매장주 가입"}
              {tab === "invite_signup" && "판매사 가입 (초대 코드)"}
              {tab === "reset_password" && "비밀번호 재설정"}
            </CardTitle>
            <CardDescription>
              {tab === "login" && !showForgotForm && "매장주·판매사 모두 이 화면에서 로그인합니다. 매장주가 먼저 로그인해야 판매사 로그인이 가능합니다."}
              {tab === "login" && showForgotForm && "가입 시 사용한 아이디로 재설정 링크를 받을 수 있습니다."}
              {tab === "tenant_signup" && "매장을 등록하고 사장님 계정을 만드세요. 가입 후 판매사를 초대할 수 있습니다."}
              {tab === "invite_signup" && "매장주가 발급한 초대 코드를 입력한 뒤, 판매사 계정을 만드세요."}
              {tab === "reset_password" && "새 비밀번호를 입력하세요."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {tab === "login" && !showForgotForm && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="loginId" className="text-sm font-medium text-foreground">아이디</label>
                  <Input id="loginId" type="text" placeholder="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" className="w-full" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">비밀번호</label>
                  <PasswordInput id="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="w-full" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      id="autoLogin"
                      checked={autoLogin}
                      onChange={(e) => setAutoLogin(e.target.checked)}
                    />
                    <Label htmlFor="autoLogin" className="text-sm font-normal text-muted-foreground cursor-pointer">
                      자동로그인
                    </Label>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowForgotForm(true); setForgotMessage(null); setForgotLoginId(""); }}
                    className="text-sm text-muted-foreground underline hover:text-foreground"
                  >
                    비밀번호 찾기
                  </button>
                </div>
                <Button type="submit" className="w-full" size="lg">로그인</Button>
              </form>
            )}

            {tab === "login" && showForgotForm && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">가입 시 사용한 아이디를 입력하시면 재설정 링크를 생성합니다.</p>
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <div className="space-y-2">
                    <label htmlFor="forgotLoginId" className="text-sm font-medium text-foreground">아이디</label>
                    <Input id="forgotLoginId" type="text" placeholder="아이디" value={forgotLoginId} onChange={(e) => setForgotLoginId(e.target.value)} autoComplete="username" className="w-full" />
                  </div>
                  {forgotMessage?.type === "error" && <p className="text-sm text-destructive">{forgotMessage.text}</p>}
                  {forgotMessage?.type === "link" && (
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                      <p className="mb-2 font-medium text-foreground">아래 링크를 복사해 브라우저에서 열어 새 비밀번호를 설정하세요. (1시간 유효)</p>
                      <input type="text" readOnly value={forgotMessage.text} className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs font-mono" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={forgotLoading || !forgotLoginId.trim()} className="flex-1">
                      {forgotLoading ? "처리 중…" : "재설정 링크 받기"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setShowForgotForm(false); setForgotMessage(null); }}>취소</Button>
                  </div>
                </form>
              </div>
            )}

            {tab === "reset_password" && (
              <div className="space-y-4">
                {resetSuccess ? (
                  <>
                    <p className="text-sm text-foreground">비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.</p>
                    <Button type="button" className="w-full" size="lg" onClick={() => { setTab("login"); setResetSuccess(false); }}>로그인하기</Button>
                  </>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <p className="text-sm text-muted-foreground">새 비밀번호를 입력하세요.</p>
                    <div className="space-y-2">
                      <label htmlFor="resetPassword" className="text-sm font-medium text-foreground">새 비밀번호</label>
                      <PasswordInput id="resetPassword" placeholder="비밀번호 (8자 이상, 특수문자 포함)" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} autoComplete="new-password" className="w-full" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="resetPasswordConfirm" className="text-sm font-medium text-foreground">비밀번호 확인</label>
                      <PasswordInput id="resetPasswordConfirm" placeholder="비밀번호 다시 입력" value={resetPasswordConfirm} onChange={(e) => setResetPasswordConfirm(e.target.value)} autoComplete="new-password" className="w-full" />
                    </div>
                    {resetError && <p className="text-sm text-destructive">{resetError}</p>}
                    <Button type="submit" className="w-full" size="lg" disabled={resetLoading}>
                      {resetLoading ? "처리 중…" : "비밀번호 변경"}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => { startNavigation(); router.push("/login"); }}>로그인으로 돌아가기</Button>
                  </form>
                )}
              </div>
            )}

            {tab === "tenant_signup" && (
              <form onSubmit={handleTenantSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">매장명</label>
                  <Input type="text" placeholder="예: OO휴대폰" value={shopName} onChange={(e) => setShopName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">이름</label>
                  <Input type="text" placeholder="사장님 이름" value={signName} onChange={(e) => setSignName(e.target.value)} autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">이메일</label>
                  <Input type="email" placeholder="email@example.com" value={signEmail} onChange={(e) => setSignEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">아이디</label>
                  <Input type="text" placeholder="로그인 아이디" value={signLoginId} onChange={(e) => setSignLoginId(e.target.value)} autoComplete="username" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">비밀번호</label>
                  <PasswordInput placeholder="비밀번호 (8자 이상, 특수문자 포함)" value={signPassword} onChange={(e) => setSignPassword(e.target.value)} autoComplete="new-password" />
                  <p className="text-xs text-muted-foreground">8자 이상, 특수문자 1자 이상 포함</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">비밀번호 확인</label>
                  <PasswordInput placeholder="비밀번호 다시 입력" value={signPasswordConfirm} onChange={(e) => setSignPasswordConfirm(e.target.value)} autoComplete="new-password" />
                </div>
                <Button type="submit" className="w-full" size="lg">매장주로 가입</Button>
              </form>
            )}

            {tab === "invite_signup" && (
              <form onSubmit={handleInviteSignUp} className="space-y-4">
                <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <label className="text-sm font-semibold text-foreground">매장 초대 코드 (필수)</label>
                  <p className="text-xs text-muted-foreground">어느 매장 소속인지 코드로 확인합니다. 매장주가 발급한 코드를 입력하세요.</p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="매장주가 발급한 코드 입력"
                      value={inviteCode}
                      onChange={(e) => {
                        setInviteCode(e.target.value.toUpperCase());
                        setInviteCodeValid(null);
                      }}
                      className="font-mono"
                    />
                    <Button type="button" variant="outline" onClick={checkInviteCode}>확인</Button>
                  </div>
                  {inviteCodeValid === false && <p className="text-sm text-destructive">유효하지 않거나 만료된 코드입니다.</p>}
                </div>
                {inviteCodeValid && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">이름</label>
                      <Input type="text" placeholder="이름" value={inviteSignName} onChange={(e) => setInviteSignName(e.target.value)} autoComplete="name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">이메일</label>
                      <Input type="email" placeholder="email@example.com" value={inviteSignEmail} onChange={(e) => setInviteSignEmail(e.target.value)} autoComplete="email" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">아이디</label>
                      <Input type="text" placeholder="로그인 아이디" value={inviteSignLoginId} onChange={(e) => setInviteSignLoginId(e.target.value)} autoComplete="username" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">비밀번호</label>
                      <PasswordInput placeholder="비밀번호 (8자 이상, 특수문자 포함)" value={inviteSignPassword} onChange={(e) => setInviteSignPassword(e.target.value)} autoComplete="new-password" />
                      <p className="text-xs text-muted-foreground">8자 이상, 특수문자 1자 이상 포함</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">비밀번호 확인</label>
                      <PasswordInput placeholder="비밀번호 다시 입력" value={inviteSignPasswordConfirm} onChange={(e) => setInviteSignPasswordConfirm(e.target.value)} autoComplete="new-password" />
                    </div>
                    {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
                    <Button type="submit" className="w-full" size="lg">판매사로 가입</Button>
                  </>
                )}
              </form>
            )}
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="underline hover:text-foreground">홈으로 돌아가기</Link>
          {" · "}
          <Link href="/signup-super-admin" className="underline hover:text-foreground">슈퍼 어드민 가입</Link>
        </p>
      </main>
    </div>
  );
}

/**
 * 로그인 페이지 컴포넌트
 *
 * URL 쿼리 파라미터로 탭을 제어할 수 있습니다.
 * 예: /login?tab=tenant_signup
 *
 * Next.js prerendering에서 useSearchParams 사용을 위해
 * Suspense로 감싼 래퍼 컴포넌트를 제공합니다.
 */
export default function LoginPage() {
  return (
    <div suppressHydrationWarning>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
            페이지를 불러오는 중입니다...
          </div>
        }
      >
        <LoginPageInner />
      </Suspense>
    </div>
  );
}
