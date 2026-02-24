/**
 * 자동 재시도 유틸리티
 * 
 * 역할:
 * - 네트워크 에러나 일시적 오류 발생 시 자동 재시도
 * - Exponential Backoff 알고리즘 적용
 * - 최대 재시도 횟수 제한
 * - 재시도 가능한 에러 타입 감지
 * 
 * @file auto-retry.ts
 */

/**
 * 재시도 가능한 에러 타입
 */
export type RetryableError = 
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "SERVER_ERROR"
  | "RATE_LIMIT"
  | "UNKNOWN";

/**
 * 재시도 설정 옵션
 */
export interface RetryOptions {
  /** 최대 재시도 횟수 (기본값: 3) */
  maxRetries?: number;
  /** 초기 지연 시간 (밀리초, 기본값: 1000) */
  initialDelay?: number;
  /** 최대 지연 시간 (밀리초, 기본값: 10000) */
  maxDelay?: number;
  /** 지연 시간 배수 (기본값: 2) */
  backoffMultiplier?: number;
  /** 재시도 가능한 에러 타입 필터 */
  retryableErrors?: RetryableError[];
}

/**
 * 기본 재시도 설정
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ["NETWORK_ERROR", "TIMEOUT", "SERVER_ERROR", "RATE_LIMIT"],
};

/**
 * 에러 타입 감지
 * 
 * @param error - 발생한 에러 객체
 * @returns 에러 타입
 */
function detectErrorType(error: unknown): RetryableError {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "NETWORK_ERROR";
  }
  if (error instanceof Error && error.message.includes("timeout")) {
    return "TIMEOUT";
  }
  if (error instanceof Response) {
    if (error.status === 429) return "RATE_LIMIT";
    if (error.status >= 500) return "SERVER_ERROR";
  }
  return "UNKNOWN";
}

/**
 * 지연 시간 계산 (Exponential Backoff)
 * 
 * @param attempt - 현재 시도 횟수 (0부터 시작)
 * @param options - 재시도 옵션
 * @returns 지연 시간 (밀리초)
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  return Math.min(delay, options.maxDelay);
}

/**
 * 자동 재시도가 적용된 함수 실행
 * 
 * Exponential Backoff 알고리즘을 사용하여 실패한 작업을 자동으로 재시도합니다.
 * 
 * @param fn - 실행할 비동기 함수
 * @param options - 재시도 옵션
 * @returns 함수 실행 결과
 * 
 * @example
 * ```typescript
 * const result = await withAutoRetry(
 *   () => fetch('/api/data'),
 *   { maxRetries: 3 }
 * );
 * ```
 */
export async function withAutoRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorType = detectErrorType(error);

      // 재시도 불가능한 에러면 즉시 throw
      if (!opts.retryableErrors.includes(errorType)) {
        throw error;
      }

      // 마지막 시도면 에러 throw
      if (attempt === opts.maxRetries) {
        throw error;
      }

      // 지연 후 재시도
      const delay = calculateDelay(attempt, opts);
      console.warn(
        `[AutoRetry] 시도 ${attempt + 1}/${opts.maxRetries + 1} 실패 (${errorType}). ${delay}ms 후 재시도...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Fetch API용 자동 재시도 래퍼
 * 
 * fetch 호출에 자동 재시도 로직을 적용합니다.
 * 
 * @param input - fetch의 첫 번째 인자 (URL 또는 Request)
 * @param init - fetch의 두 번째 인자 (옵션)
 * @param retryOptions - 재시도 옵션
 * @returns Response 객체
 * 
 * @example
 * ```typescript
 * const response = await fetchWithRetry('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * });
 * ```
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return withAutoRetry(
    async () => {
      const response = await fetch(input, init);
      
      // HTTP 에러 상태 코드도 재시도 대상으로 처리
      if (!response.ok && response.status >= 500) {
        throw response;
      }
      
      return response;
    },
    retryOptions
  );
}
