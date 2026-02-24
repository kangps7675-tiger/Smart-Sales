# 자동 오류 업데이트 가이드

이 문서는 시스템이 발생하는 오류를 자동으로 추적하고 업데이트하는 방법을 설명합니다.

## 🔄 자동 오류 추적 시스템

시스템은 모든 오류를 자동으로 추적하고 분석합니다:

### 추적되는 오류 유형

1. **HYDRATION**: Hydration 관련 오류
2. **NETWORK**: 네트워크/API 오류
3. **BUILD**: 빌드 관련 오류
4. **STORAGE**: 로컬 스토리지 오류
5. **RUNTIME**: 런타임 오류
6. **API**: API 라우트 오류
7. **UNKNOWN**: 기타 오류

### 자동 추적 위치

- ✅ 전역 에러 핸들러 (`src/lib/global-error-handler.ts`)
- ✅ 에러 바운더리 (`src/app/error.tsx`, `src/app/global-error.tsx`)
- ✅ Promise rejection 핸들러
- ✅ 모든 자동 복구 시도

## 📊 오류 통계 확인

### 개발자 콘솔에서 확인

브라우저 콘솔에서 다음 명령어를 실행하세요:

```javascript
// 오류 통계 가져오기
import { getErrorStats } from '@/lib/error-tracker';
const stats = getErrorStats();
console.log(stats);

// 결과:
// {
//   total: 15,                    // 총 오류 발생 횟수
//   byCategory: {                 // 카테고리별 통계
//     NETWORK: 5,
//     HYDRATION: 3,
//     BUILD: 2,
//     ...
//   },
//   recent: [...],                // 최근 24시간 오류 (최대 10개)
//   frequent: [...]               // 빈번한 오류 (상위 10개)
// }
```

### 오류 로그 초기화

```javascript
import { clearErrorLog } from '@/lib/error-tracker';
clearErrorLog();
```

## 🔍 오류 분석 및 해결 방법 제안

시스템은 각 오류에 대해 자동으로 해결 방법을 제안합니다:

```javascript
import { suggestSolution } from '@/lib/error-tracker';
const solution = suggestSolution(error);
console.log(solution);
// 예: "브라우저 확장 프로그램을 일시적으로 비활성화해보세요."
```

## 📝 오류 발생 시 자동 동작

1. **오류 감지**: 전역 에러 핸들러가 오류를 캐치
2. **자동 분류**: 오류 타입 자동 분류 (HYDRATION, NETWORK 등)
3. **해결 방법 제안**: 카테고리별 해결 방법 자동 제안
4. **오류 기록**: localStorage에 오류 정보 저장 (최대 100개)
5. **자동 복구 시도**: 복구 가능한 오류는 자동으로 복구 시도

## 🎯 빈번한 오류 패턴 감지

시스템은 동일한 오류가 반복 발생하면 자동으로 감지합니다:

- 동일한 오류 메시지와 카테고리로 그룹화
- 발생 횟수 자동 카운트
- 최근 발생 시간 추적

## 🔧 수동 업데이트 방법

새로운 오류가 발생했을 때:

1. **오류 확인**: 브라우저 콘솔에서 오류 메시지 확인
2. **통계 확인**: `getErrorStats()`로 오류 통계 확인
3. **해결 방법 확인**: `suggestSolution(error)`로 제안된 해결 방법 확인
4. **수동 해결**: 제안된 방법으로 해결 시도
5. **시스템 업데이트**: 해결 방법이 효과적이면 시스템에 반영

## 📋 오류 로그 구조

각 오류는 다음 정보를 포함합니다:

```typescript
{
  message: string;        // 오류 메시지
  stack?: string;        // 스택 트레이스
  category: ErrorCategory; // 오류 카테고리
  timestamp: number;      // 발생 시간 (Unix timestamp)
  url: string;            // 발생 URL
  userAgent: string;      // 사용자 에이전트
  count: number;          // 발생 횟수
  solution?: string;      // 해결 방법
}
```

## 🚀 향후 개선 사항

다음 기능들이 계획되어 있습니다:

- [ ] 오류 통계 대시보드 페이지 (`/dashboard/errors`)
- [ ] 자동 해결 방법 적용 (특정 패턴 감지 시)
- [ ] 오류 알림 시스템 (빈번한 오류 발생 시)
- [ ] 오류 리포트 생성 및 내보내기
- [ ] 서버 사이드 오류 추적 통합

## 💡 팁

- 개발 환경에서는 모든 오류가 콘솔에 자동으로 기록됩니다
- 프로덕션 환경에서는 민감한 정보를 제외하고 기록됩니다
- 오류 로그는 localStorage에 저장되므로 브라우저를 닫아도 유지됩니다
- 최대 100개의 오류만 저장되므로 오래된 오류는 자동으로 삭제됩니다

---

**마지막 업데이트**: 2026-02-15
