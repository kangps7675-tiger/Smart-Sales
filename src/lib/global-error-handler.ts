/**
 * 전역 에러 핸들러
 * 
 * 역할:
 * - 브라우저 전역 에러 캐치
 * - Promise rejection 에러 캐치
 * - 자동 복구 시도
 * - 에러 로깅
 * 
 * @file global-error-handler.ts
 */

import { attemptGlobalRecovery, canAutoRecover } from "./auto-recovery";
import { trackError, suggestSolution } from "./error-tracker";

declare global {
  interface Window {
    __globalErrorHandlerSetup?: boolean;
  }
}

/**
 * 전역 에러 핸들러 설정
 * 
 * 브라우저의 전역 에러 이벤트를 캐치하여 자동 복구를 시도합니다.
 */
export function setupGlobalErrorHandler() {
  // 이미 설정되어 있으면 중복 설정 방지
  if (typeof window !== "undefined" && window.__globalErrorHandlerSetup) {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  // 전역 에러 핸들러
  window.addEventListener("error", (event) => {
    const error = event.error || event.message;
    console.error("[GlobalErrorHandler] 전역 에러:", error);

    // 오류 추적
    const solution = suggestSolution(error);
    trackError(error, solution ?? undefined);

    // 자동 복구 가능한 에러인지 확인
    if (canAutoRecover(error)) {
      console.log("[GlobalErrorHandler] 자동 복구 시도 중...");
      attemptGlobalRecovery(error);
    }
  });

  // Promise rejection 핸들러
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    console.error("[GlobalErrorHandler] 처리되지 않은 Promise rejection:", reason);

    // 오류 추적
    const solution = suggestSolution(reason);
    trackError(reason, solution ?? undefined);

    // 자동 복구 가능한 에러인지 확인
    if (canAutoRecover(reason)) {
      console.log("[GlobalErrorHandler] 자동 복구 시도 중...");
      const recovered = attemptGlobalRecovery(reason);
      
      // 복구 성공 시 이벤트 기본 동작 방지
      if (recovered) {
        event.preventDefault();
      }
    }
  });

  // 설정 완료 플래그
  window.__globalErrorHandlerSetup = true;
}
