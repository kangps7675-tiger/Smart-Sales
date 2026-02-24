/**
 * 클라이언트 자동 복구 유틸리티
 * 
 * 역할:
 * - 로컬 스토리지 손상 감지 및 자동 초기화
 * - Zustand 상태 손상 감지 및 자동 복구
 * - 페이지 로드 실패 시 자동 새로고침
 * - 상태 동기화 실패 시 자동 재동기화
 * 
 * @file auto-recovery.ts
 */

/**
 * 로컬 스토리지 손상 감지 및 복구
 * 
 * @param key - 스토리지 키
 * @returns 복구 성공 여부
 */
export function recoverLocalStorage(key: string): boolean {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return true;

    // JSON 파싱 시도
    JSON.parse(value);
    return true;
  } catch {
    console.warn(`[AutoRecovery] 로컬 스토리지 손상 감지 (${key}). 초기화합니다.`);
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 모든 로컬 스토리지 키 검증 및 복구
 * 
 * @returns 복구된 키 목록
 */
export function recoverAllLocalStorage(): string[] {
  const recovered: string[] = [];

  try {
    // 모든 키 가져오기 (localStorage는 직접 열거 불가능하므로 일반적인 키들 체크)
    const commonKeys = [
      "auth-storage",
      "reports-storage",
      "contracts-storage",
      "policies-storage",
      "theme",
    ];

    for (const key of commonKeys) {
      if (recoverLocalStorage(key)) {
        recovered.push(key);
      }
    }
  } catch (error) {
    console.error("[AutoRecovery] 로컬 스토리지 복구 중 오류:", error);
  }

  return recovered;
}

/**
 * 페이지 자동 새로고침 (최대 횟수 제한)
 * 
 * @param maxRetries - 최대 새로고침 횟수 (기본값: 3)
 * @returns 새로고침 가능 여부
 */
export function autoRefresh(maxRetries: number = 3): boolean {
  const key = "__auto_refresh_count";
  const count = parseInt(sessionStorage.getItem(key) || "0", 10);

  if (count >= maxRetries) {
    console.warn("[AutoRecovery] 최대 새로고침 횟수에 도달했습니다.");
    return false;
  }

  sessionStorage.setItem(key, String(count + 1));
  console.log(`[AutoRecovery] 자동 새로고침 시도 ${count + 1}/${maxRetries}`);
  
  // 짧은 지연 후 새로고침 (에러 로깅 시간 확보)
  setTimeout(() => {
    window.location.reload();
  }, 1000);

  return true;
}

/**
 * 에러 타입에 따른 자동 복구 전략 결정
 * 
 * @param error - 발생한 에러
 * @returns 복구 가능 여부
 */
export function canAutoRecover(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // 네트워크 에러는 재시도 가능
    if (message.includes("network") || message.includes("fetch")) {
      return true;
    }

    // 타임아웃은 재시도 가능
    if (message.includes("timeout")) {
      return true;
    }

    // 스토리지 에러는 복구 가능
    if (message.includes("quota") || message.includes("storage")) {
      return true;
    }

    // 파싱 에러는 복구 가능
    if (message.includes("json") || message.includes("parse")) {
      return true;
    }
  }

  return false;
}

/**
 * 전역 에러 복구 시도
 * 
 * @param error - 발생한 에러
 * @returns 복구 성공 여부
 */
export function attemptGlobalRecovery(error: unknown): boolean {
  // 로컬 스토리지 복구 시도
  recoverAllLocalStorage();

  // 복구 가능한 에러인지 확인
  if (!canAutoRecover(error)) {
    return false;
  }

  // 자동 새로고침 시도
  return autoRefresh();
}
