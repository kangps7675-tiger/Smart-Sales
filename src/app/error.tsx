/**
 * 전역 에러 바운더리 컴포넌트
 * 
 * 역할:
 * - 애플리케이션 전역에서 발생하는 에러를 캐치하여 표시
 * - 사용자에게 친화적인 에러 메시지 제공
 * - 에러 복구 옵션 제공
 * 
 * @file error.tsx
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { attemptGlobalRecovery, canAutoRecover } from "@/lib/auto-recovery";
import { trackError, suggestSolution } from "@/lib/error-tracker";

/**
 * 에러 바운더리 Props 인터페이스
 */
interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 전역 에러 바운더리 컴포넌트
 * 
 * Next.js App Router에서 에러가 발생하면 이 컴포넌트가 표시됩니다.
 * 
 * @param error - 발생한 에러 객체
 * @param reset - 에러 상태를 초기화하고 다시 시도하는 함수
 */
export default function Error({ error, reset }: ErrorProps) {
  const [autoRecoveryAttempted, setAutoRecoveryAttempted] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // 에러 로깅 및 추적
    console.error("애플리케이션 에러:", error);
    const solution = suggestSolution(error);
    trackError(error, solution || undefined);

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">오류가 발생했습니다</CardTitle>
          <CardDescription>
            예상치 못한 오류가 발생했습니다. 아래 버튼을 클릭하여 다시 시도하거나, 페이지를 새로고침해주세요.
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
  );
}
