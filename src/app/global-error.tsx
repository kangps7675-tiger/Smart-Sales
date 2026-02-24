/**
 * 루트 레벨 전역 에러 바운더리 컴포넌트
 * 
 * 역할:
 * - 루트 레이아웃에서 발생하는 에러를 캐치
 * - 가장 상위 레벨의 에러 처리
 * - html, body 태그를 포함한 완전한 HTML 구조 제공
 * 
 * @file global-error.tsx
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { attemptGlobalRecovery, canAutoRecover } from "@/lib/auto-recovery";
import { trackError, suggestSolution } from "@/lib/error-tracker";

/**
 * 루트 레벨 에러 바운더리 Props 인터페이스
 */
interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 루트 레벨 전역 에러 바운더리 컴포넌트
 * 
 * 루트 레이아웃에서 발생하는 에러를 처리합니다.
 * 이 컴포넌트는 html, body 태그를 포함한 완전한 HTML을 반환해야 합니다.
 * 
 * @param error - 발생한 에러 객체
 * @param reset - 에러 상태를 초기화하고 다시 시도하는 함수
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [autoRecoveryAttempted, setAutoRecoveryAttempted] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // 에러 로깅 및 추적
    console.error("루트 레벨 에러:", error);
    const solution = suggestSolution(error);
    trackError(error, solution ?? undefined);

    // 자동 복구 가능한 에러인지 확인하고 자동 복구 시도
    if (!autoRecoveryAttempted && canAutoRecover(error)) {
      setAutoRecoveryAttempted(true);
      setIsRecovering(true);
      
      const recovered = attemptGlobalRecovery(error);
      
      if (recovered) {
        console.log("[AutoRecovery] 자동 복구 시도 중...");
        // 복구 성공 시 짧은 지연 후 자동 재시도
        setTimeout(() => {
          setIsRecovering(false);
          reset();
        }, 2000);
      } else {
        setIsRecovering(false);
      }
    }
  }, [error, autoRecoveryAttempted, reset]);

  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">심각한 오류가 발생했습니다</CardTitle>
              <CardDescription>
                시스템 레벨에서 오류가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isRecovering && (
                <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
                  <p>자동 복구를 시도하고 있습니다...</p>
                </div>
              )}
              {process.env.NODE_ENV === "development" && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-mono text-muted-foreground">
                    {error.message || "알 수 없는 오류"}
                  </p>
                  {error.digest && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      에러 ID: {error.digest}
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={reset} className="flex-1" disabled={isRecovering}>
                  {isRecovering ? "복구 중..." : "다시 시도"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = "/";
                  }}
                  disabled={isRecovering}
                >
                  홈으로
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
