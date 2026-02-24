/**
 * 전역 에러 핸들러 설정 컴포넌트
 * 
 * 역할:
 * - 클라이언트 사이드에서 전역 에러 핸들러 초기화
 * - 브라우저 전역 에러 및 Promise rejection 캐치
 * 
 * @file global-error-setup.tsx
 */

"use client";

import { useEffect } from "react";
import { setupGlobalErrorHandler } from "@/lib/global-error-handler";

/**
 * 전역 에러 핸들러 설정 컴포넌트
 * 
 * 앱이 마운트될 때 전역 에러 핸들러를 설정합니다.
 */
export function GlobalErrorSetup() {
  useEffect(() => {
    setupGlobalErrorHandler();
  }, []);

  return null;
}
