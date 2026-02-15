"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/client/store/useAuthStore";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
function NaverIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
    </svg>
  );
}
function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.328-1.226.023-1.12-.613l.267-1.716C2.88 11.6 1.5 9.595 1.5 7.185 1.5 3.665 6.201 3 12 3z" />
    </svg>
  );
}
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

const TAB_IDS = ["login", "tenant_signup", "invite_signup", "customer_signup"] as const;
type Tab = (typeof TAB_IDS)[number];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const signUpAsTenantAdmin = useAuthStore((s) => s.signUpAsTenantAdmin);
  const signUpWithInvite = useAuthStore((s) => s.signUpWithInvite);
  const signUpAsCustomer = useAuthStore((s) => s.signUpAsCustomer);

  const tabFromUrl = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(tabFromUrl && TAB_IDS.includes(tabFromUrl) ? tabFromUrl : "login");

  useEffect(() => {
    if (tabFromUrl && TAB_IDS.includes(tabFromUrl)) {
      setTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [autoLogin, setAutoLogin] = useState(true);

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

  const [customerCode, setCustomerCode] = useState("");
  const [customerCodeValid, setCustomerCodeValid] = useState<boolean | null>(null);
  const [customerInviteShopName, setCustomerInviteShopName] = useState("");
  const [customerSignName, setCustomerSignName] = useState("");
  const [customerSignEmail, setCustomerSignEmail] = useState("");
  const [customerSignLoginId, setCustomerSignLoginId] = useState("");
  const [customerSignPassword, setCustomerSignPassword] = useState("");
  const [customerSignPasswordConfirm, setCustomerSignPasswordConfirm] = useState("");
  const [customerError, setCustomerError] = useState("");

  const checkInviteCode = () => {
    const { invites } = useAuthStore.getState();
    const code = inviteCode.trim().toUpperCase();
    const valid = invites.some(
      (i) => i.code.toUpperCase() === code && new Date(i.expiresAt) > new Date()
    );
    setInviteCodeValid(valid);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) return;
    login(loginId.trim(), password, autoLogin);
    router.push("/dashboard");
  };

  const handleTenantSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !signName.trim() || !signEmail.trim() || !signLoginId.trim() || !signPassword) return;
    if (signPassword !== signPasswordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    signUpAsTenantAdmin(
      shopName.trim(),
      {
        name: signName.trim(),
        email: signEmail.trim(),
        loginId: signLoginId.trim(),
      },
      signPassword
    );
    router.push("/dashboard");
  };

  const handleInviteSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    if (inviteSignPassword !== inviteSignPasswordConfirm) {
      setInviteError("비밀번호가 일치하지 않습니다.");
      return;
    }
    const result = signUpWithInvite(
      inviteCode.trim(),
      {
        name: inviteSignName.trim(),
        email: inviteSignEmail.trim(),
        loginId: inviteSignLoginId.trim(),
      },
      inviteSignPassword
    );
    if (result.success) router.push("/dashboard");
    else setInviteError(result.error ?? "가입에 실패했습니다.");
  };

  const checkCustomerCode = () => {
    const { customerInvites } = useAuthStore.getState();
    const code = customerCode.trim().toUpperCase();
    const invite = customerInvites.find(
      (i) => i.code.toUpperCase() === code && new Date(i.expiresAt) > new Date()
    );
    setCustomerCodeValid(!!invite);
    setCustomerInviteShopName(invite?.shopName ?? "");
  };

  const handleCustomerSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError("");
    if (customerSignPassword !== customerSignPasswordConfirm) {
      setCustomerError("비밀번호가 일치하지 않습니다.");
      return;
    }
    const result = signUpAsCustomer(
      customerCode.trim(),
      {
        name: customerSignName.trim(),
        email: customerSignEmail.trim(),
        loginId: customerSignLoginId.trim(),
      },
      customerSignPassword
    );
    if (result.success) router.push("/dashboard");
    else setCustomerError(result.error ?? "가입에 실패했습니다.");
  };

  const handleSocialLogin = (provider: string) => {
    alert(`${provider} 로그인은 준비 중입니다.`);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "login", label: "로그인" },
    { id: "tenant_signup", label: "매장주 가입" },
    { id: "invite_signup", label: "판매사 가입" },
    { id: "customer_signup", label: "고객 가입" },
  ];

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
              {tab === "login" && "로그인"}
              {tab === "tenant_signup" && "매장주 가입"}
              {tab === "invite_signup" && "판매사 가입 (초대 코드)"}
              {tab === "customer_signup" && "고객 가입"}
            </CardTitle>
            <CardDescription>
              {tab === "login" && "아이디와 비밀번호를 입력하세요."}
              {tab === "tenant_signup" && "매장을 등록하고 사장님 계정을 만드세요. 가입 후 판매사를 초대할 수 있습니다."}
              {tab === "invite_signup" && "매장주가 발급한 초대 코드를 입력한 뒤, 판매사 계정을 만드세요."}
              {tab === "customer_signup" && "매장에서 받은 고객 초대 코드를 입력하면 해당 매장 고객으로 가입할 수 있습니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="loginId" className="text-sm font-medium text-foreground">아이디</label>
                  <Input id="loginId" type="text" placeholder="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" className="w-full" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">비밀번호</label>
                  <Input id="password" type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="w-full" />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={autoLogin} onChange={(e) => setAutoLogin(e.target.checked)} className="h-4 w-4 rounded border-input" />
                  자동로그인
                </label>
                <Button type="submit" className="w-full" size="lg">로그인</Button>
              </form>
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
                  <Input type="password" placeholder="비밀번호" value={signPassword} onChange={(e) => setSignPassword(e.target.value)} autoComplete="new-password" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">비밀번호 확인</label>
                  <Input type="password" placeholder="비밀번호 다시 입력" value={signPasswordConfirm} onChange={(e) => setSignPasswordConfirm(e.target.value)} autoComplete="new-password" />
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
                      <Input type="password" placeholder="비밀번호" value={inviteSignPassword} onChange={(e) => setInviteSignPassword(e.target.value)} autoComplete="new-password" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">비밀번호 확인</label>
                      <Input type="password" placeholder="비밀번호 다시 입력" value={inviteSignPasswordConfirm} onChange={(e) => setInviteSignPasswordConfirm(e.target.value)} autoComplete="new-password" />
                    </div>
                    {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
                    <Button type="submit" className="w-full" size="lg">판매사로 가입</Button>
                  </>
                )}
              </form>
            )}

            {tab === "customer_signup" && (
              <form onSubmit={handleCustomerSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">고객 초대 코드</label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="매장에서 받은 코드"
                      value={customerCode}
                      onChange={(e) => {
                        setCustomerCode(e.target.value.toUpperCase());
                        setCustomerCodeValid(null);
                      }}
                    />
                    <Button type="button" variant="outline" onClick={checkCustomerCode}>확인</Button>
                  </div>
                  {customerCodeValid === false && <p className="text-sm text-destructive">유효하지 않거나 만료된 코드입니다.</p>}
                </div>
                {customerCodeValid && customerInviteShopName && (
                  <>
                    <p className="text-sm text-muted-foreground"><strong className="text-foreground">{customerInviteShopName}</strong> 매장 고객으로 가입합니다.</p>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">이름</label>
                      <Input type="text" placeholder="이름" value={customerSignName} onChange={(e) => setCustomerSignName(e.target.value)} autoComplete="name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">이메일</label>
                      <Input type="email" placeholder="email@example.com" value={customerSignEmail} onChange={(e) => setCustomerSignEmail(e.target.value)} autoComplete="email" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">아이디</label>
                      <Input type="text" placeholder="로그인 아이디" value={customerSignLoginId} onChange={(e) => setCustomerSignLoginId(e.target.value)} autoComplete="username" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">비밀번호</label>
                      <Input type="password" placeholder="비밀번호" value={customerSignPassword} onChange={(e) => setCustomerSignPassword(e.target.value)} autoComplete="new-password" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">비밀번호 확인</label>
                      <Input type="password" placeholder="비밀번호 다시 입력" value={customerSignPasswordConfirm} onChange={(e) => setCustomerSignPasswordConfirm(e.target.value)} autoComplete="new-password" />
                    </div>
                    {customerError && <p className="text-sm text-destructive">{customerError}</p>}
                    <Button type="submit" className="w-full" size="lg">고객으로 가입</Button>
                  </>
                )}
              </form>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase text-muted-foreground"><span className="bg-card px-2">또는</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => handleSocialLogin("구글")} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#dadce0] bg-white text-[#3c4043] shadow-sm transition-colors hover:bg-[#f8f9fa] dark:border-border dark:bg-[#303134] dark:text-[#e8eaed] dark:hover:bg-[#3c4043]">
                <GoogleIcon className="h-5 w-5 shrink-0" /><span className="text-sm font-medium">Google로 로그인</span>
              </button>
              <button type="button" onClick={() => handleSocialLogin("네이버")} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#03C75A] text-white shadow-sm transition-opacity hover:opacity-95">
                <NaverIcon className="h-5 w-5 shrink-0" /><span className="text-sm font-medium">네이버로 로그인</span>
              </button>
              <button type="button" onClick={() => handleSocialLogin("카카오톡")} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] text-[#191919] shadow-sm transition-opacity hover:opacity-95">
                <KakaoIcon className="h-5 w-5 shrink-0" /><span className="text-sm font-medium">카카오로 로그인</span>
              </button>
              <button type="button" onClick={() => handleSocialLogin("페이스북")} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1877F2] text-white shadow-sm transition-opacity hover:opacity-95">
                <FacebookIcon className="h-5 w-5 shrink-0" /><span className="text-sm font-medium">Facebook으로 로그인</span>
              </button>
            </div>
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
