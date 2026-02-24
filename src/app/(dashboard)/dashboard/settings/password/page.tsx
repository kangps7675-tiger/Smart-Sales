"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/client/store/useAuthStore";
import { validatePassword } from "@/lib/password-validation";

export default function PasswordSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("error", "로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    if (!currentPassword) {
      showToast("error", "현재 비밀번호를 입력하세요.");
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      showToast("error", validation.message ?? "비밀번호 규칙을 확인하세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("error", "새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const message =
          (json && (json.error as string | undefined)) ||
          "비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요.";
        showToast("error", message);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("success", "비밀번호가 변경되었습니다.");
    } catch (error) {
      console.error("[Settings] 비밀번호 변경 요청 실패", error);
      showToast("error", "비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">비밀번호 변경</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          현재 비밀번호를 확인한 뒤, 새 비밀번호로 변경합니다. 8자 이상, 특수문자 1자 이상을 포함해야 합니다.
        </p>
      </div>

      <Card className="border-border/80 max-w-lg">
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
          <CardDescription>보안을 위해 주기적으로 비밀번호를 변경해 주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">현재 비밀번호</label>
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">새 비밀번호</label>
              <Input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 (8자 이상, 특수문자 포함)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">새 비밀번호 확인</label>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 다시 입력"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "변경 중..." : "비밀번호 저장"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-600 text-white dark:bg-green-700"
              : "bg-destructive text-destructive-foreground"
          }`}
          role="alert"
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

