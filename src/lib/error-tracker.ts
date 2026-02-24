/**
 * 오류 추적 및 자동 업데이트 시스템
 * 
 * 역할:
 * - 발생한 오류를 자동으로 수집 및 분석
 * - 오류 패턴 감지
 * - 자동 방지책 제안 및 적용
 * - 오류 통계 수집
 * 
 * @file error-tracker.ts
 */

/**
 * 오류 타입 분류
 */
export type ErrorCategory =
  | "HYDRATION"
  | "NETWORK"
  | "BUILD"
  | "STORAGE"
  | "RUNTIME"
  | "API"
  | "UNKNOWN";

/**
 * 오류 정보 인터페이스
 */
export interface ErrorInfo {
  /** 오류 메시지 */
  message: string;
  /** 오류 스택 */
  stack?: string;
  /** 오류 카테고리 */
  category: ErrorCategory;
  /** 발생 시간 */
  timestamp: number;
  /** 발생 URL */
  url: string;
  /** 사용자 에이전트 */
  userAgent: string;
  /** 오류 발생 횟수 */
  count: number;
  /** 해결 방법 (있는 경우) */
  solution?: string;
}

/**
 * 오류 저장소 키
 */
const ERROR_STORAGE_KEY = "__error_tracker";

/**
 * 최대 저장 오류 수
 */
const MAX_STORED_ERRORS = 100;

/**
 * 오류 카테고리 자동 분류
 * 
 * @param error - 발생한 에러
 * @returns 오류 카테고리
 */
function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || "";

    if (message.includes("hydration") || stack.includes("hydration")) {
      return "HYDRATION";
    }
    if (message.includes("network") || message.includes("fetch") || message.includes("timeout")) {
      return "NETWORK";
    }
    if (message.includes("build") || message.includes("module") || message.includes("cannot find")) {
      return "BUILD";
    }
    if (message.includes("storage") || message.includes("quota") || message.includes("localstorage")) {
      return "STORAGE";
    }
    if (message.includes("api") || message.includes("route")) {
      return "API";
    }
  }
  return "RUNTIME";
}

/**
 * 저장된 오류 목록 가져오기
 * 
 * @returns 오류 목록
 */
function getStoredErrors(): ErrorInfo[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(ERROR_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * 오류 목록 저장
 * 
 * @param errors - 저장할 오류 목록
 */
function saveErrors(errors: ErrorInfo[]): void {
  if (typeof window === "undefined") return;
  try {
    // 최대 개수 제한
    const limited = errors.slice(-MAX_STORED_ERRORS);
    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.warn("[ErrorTracker] 오류 저장 실패:", error);
  }
}

/**
 * 오류 기록
 * 
 * @param error - 발생한 에러
 * @param solution - 해결 방법 (있는 경우)
 */
export function trackError(error: unknown, solution?: string): void {
  if (typeof window === "undefined") return;

  try {
    const errors = getStoredErrors();
    const category = categorizeError(error);
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // 동일한 오류 찾기 (메시지와 카테고리 기준)
    const existingIndex = errors.findIndex(
      (e) => e.message === message && e.category === category
    );

    if (existingIndex >= 0) {
      // 기존 오류 카운트 증가
      errors[existingIndex].count++;
      errors[existingIndex].timestamp = Date.now();
      if (solution) {
        errors[existingIndex].solution = solution;
      }
    } else {
      // 새 오류 추가
      errors.push({
        message,
        stack,
        category,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        count: 1,
        solution,
      });
    }

    saveErrors(errors);

    // 개발 환경에서 콘솔 출력
    if (process.env.NODE_ENV === "development") {
      console.log(`[ErrorTracker] 오류 기록됨: ${category} - ${message} (${errors.find((e) => e.message === message)?.count}회)`);
    }
  } catch (trackingError) {
    console.warn("[ErrorTracker] 오류 추적 실패:", trackingError);
  }
}

/**
 * 저장된 오류 통계 가져오기
 * 
 * @returns 오류 통계
 */
export function getErrorStats(): {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  recent: ErrorInfo[];
  frequent: ErrorInfo[];
} {
  const errors = getStoredErrors();
  const byCategory: Record<ErrorCategory, number> = {
    HYDRATION: 0,
    NETWORK: 0,
    BUILD: 0,
    STORAGE: 0,
    RUNTIME: 0,
    API: 0,
    UNKNOWN: 0,
  };

  errors.forEach((error) => {
    byCategory[error.category] = (byCategory[error.category] || 0) + error.count;
  });

  // 최근 오류 (최근 24시간)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = errors
    .filter((e) => e.timestamp > oneDayAgo)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  // 빈번한 오류 (상위 10개)
  const frequent = [...errors]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: errors.reduce((sum, e) => sum + e.count, 0),
    byCategory,
    recent,
    frequent,
  };
}

/**
 * 오류 로그 초기화
 */
export function clearErrorLog(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ERROR_STORAGE_KEY);
    console.log("[ErrorTracker] 오류 로그 초기화 완료");
  } catch (error) {
    console.warn("[ErrorTracker] 오류 로그 초기화 실패:", error);
  }
}

/**
 * 오류 해결 방법 제안
 * 
 * @param error - 발생한 에러
 * @returns 해결 방법 제안
 */
export function suggestSolution(error: unknown): string | null {
  const category = categorizeError(error);

  const solutions: Record<ErrorCategory, string[]> = {
    HYDRATION: [
      "브라우저 확장 프로그램을 일시적으로 비활성화해보세요.",
      "페이지를 새로고침하세요.",
      "suppressHydrationWarning이 적용되어 있는지 확인하세요.",
    ],
    NETWORK: [
      "인터넷 연결을 확인하세요.",
      "잠시 후 다시 시도하세요. (자동 재시도 중)",
      "API 서버 상태를 확인하세요.",
    ],
    BUILD: [
      "npm run clean을 실행하여 빌드 캐시를 정리하세요.",
      "npm run clean:all을 실행하여 완전 재설치를 시도하세요.",
      ".next 디렉토리를 삭제하고 다시 빌드하세요.",
    ],
    STORAGE: [
      "브라우저 저장소를 초기화하세요.",
      "다른 브라우저에서 시도해보세요.",
      "브라우저 캐시를 삭제하세요.",
    ],
    RUNTIME: [
      "페이지를 새로고침하세요.",
      "브라우저 콘솔에서 상세 오류를 확인하세요.",
      "개발자 도구에서 네트워크 탭을 확인하세요.",
    ],
    API: [
      "API 엔드포인트가 올바른지 확인하세요.",
      "서버 로그를 확인하세요.",
      "네트워크 연결을 확인하세요.",
    ],
    UNKNOWN: [
      "페이지를 새로고침하세요.",
      "브라우저 콘솔에서 상세 오류를 확인하세요.",
      "개발자에게 오류를 보고하세요.",
    ],
  };

  const categorySolutions = solutions[category] || solutions.UNKNOWN;
  return categorySolutions[0] || null;
}
