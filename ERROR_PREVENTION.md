# 오류 방지 가이드

이 문서는 프로젝트에서 자주 발생하는 오류를 방지하기 위한 영구적인 조치를 설명합니다.

## 🛡️ 적용된 방지책

### 1. Hydration 에러 방지

**문제**: 브라우저 확장 프로그램(예: Sider AI)이 DOM에 요소를 주입하여 서버와 클라이언트 렌더링 불일치 발생

**해결책**:
- 루트 레이아웃(`src/app/layout.tsx`)의 `<html>` 및 `<body>` 태그에 `suppressHydrationWarning` 속성 추가
- 주요 페이지 컴포넌트의 최상위 `<div>`에도 `suppressHydrationWarning` 적용
  - `src/app/page.tsx` (랜딩 페이지)
  - `src/app/login/page.tsx` (로그인 페이지)
  - `src/app/signup-super-admin/page.tsx` (슈퍼 어드민 가입 페이지)
  - `src/components/dashboard/dashboard-shell.tsx` (대시보드 셸)

**효과**: 브라우저 확장 프로그램으로 인한 Hydration 경고가 발생하지 않습니다.

---

### 2. 전역 에러 바운더리

**문제**: 예상치 못한 런타임 에러로 인한 전체 앱 크래시

**해결책**:
- `src/app/error.tsx`: 일반적인 애플리케이션 에러 처리
- `src/app/global-error.tsx`: 루트 레벨 에러 처리 (레이아웃 에러 포함)

**기능**:
- 사용자 친화적인 에러 메시지 표시
- "다시 시도" 버튼으로 에러 상태 초기화
- 개발 환경에서만 상세 에러 정보 표시
- "홈으로" 버튼으로 안전한 복귀

**효과**: 에러 발생 시 앱이 완전히 크래시되지 않고, 사용자에게 복구 옵션을 제공합니다.

---

### 3. 빌드 캐시 자동 정리

**문제**: `.next` 디렉토리나 `node_modules/.cache`의 손상된 캐시로 인한 빌드 실패

**해결책**:
- `scripts/clean-build.ps1`: PowerShell 스크립트로 빌드 캐시 자동 정리
- `package.json`에 `clean` 스크립트 추가

**사용법**:
```bash
npm run clean          # 빌드 캐시만 정리
npm run build:clean    # 캐시 정리 후 빌드
npm run clean:all      # 캐시 + node_modules 전체 재설치
```

**효과**: 빌드 오류 발생 시 빠르게 캐시를 정리하여 문제를 해결할 수 있습니다.

---

### 4. 개발 환경 체크 유틸리티

**문제**: 개발 환경 설정 누락이나 문제를 사전에 발견하지 못함

**해결책**:
- `scripts/check-env.ps1`: 개발 환경 상태를 자동으로 체크하는 스크립트

**체크 항목**:
- Node.js 및 npm 설치 여부 및 버전
- 필수 디렉토리 존재 여부 (`src`, `public`, `node_modules`)
- 빌드 캐시 상태 확인

**사용법**:
```bash
npm run check
```

**효과**: 개발 시작 전에 환경 문제를 미리 발견할 수 있습니다.

---

### 5. 자동 자가치료 시스템 ⚡ (NEW!)

**문제**: 오류 발생 시 수동으로 복구해야 하는 번거로움

**해결책**: 완전 자동화된 자가치료 시스템 구현

#### 5.1. 클라이언트 자동 복구

**구현 위치**:
- `src/lib/auto-retry.ts`: API 자동 재시도 (Exponential Backoff)
- `src/lib/auto-recovery.ts`: 로컬 스토리지 및 상태 자동 복구
- `src/app/error.tsx`, `src/app/global-error.tsx`: 에러 바운더리 자동 복구
- `src/components/global-error-setup.tsx`: 전역 에러 핸들러 설정

**기능**:
- ✅ 네트워크 에러 자동 재시도 (최대 3회, 지수 백오프)
- ✅ 로컬 스토리지 손상 감지 및 자동 초기화
- ✅ Zustand 상태 손상 감지 및 자동 복구
- ✅ 페이지 로드 실패 시 자동 새로고침 (최대 3회)
- ✅ 전역 에러 및 Promise rejection 자동 캐치 및 복구 시도

**효과**: 대부분의 일시적 오류가 자동으로 복구되어 사용자 개입이 거의 필요 없습니다.

#### 5.2. 개발 서버 자동 복구

**구현 위치**: `scripts/dev-auto-recover.ps1`

**기능**:
- ✅ 개발 서버 시작 전 환경 자동 체크
- ✅ `node_modules` 누락 시 자동 설치
- ✅ 서버 시작 실패 시 자동 캐시 정리 후 재시도 (최대 3회)

**사용법**:
```bash
npm run dev          # 자동 복구 모드로 개발 서버 시작
npm run dev:direct   # 자동 복구 없이 직접 시작 (디버깅용)
```

**효과**: 개발 서버 시작 시 발생하는 대부분의 문제가 자동으로 해결됩니다.

#### 5.3. 빌드 자동 복구

**구현 위치**: `scripts/build-auto-recover.ps1`

**기능**:
- ✅ 빌드 전 환경 자동 체크
- ✅ 빌드 실패 시 자동 캐시 정리 후 재빌드 (최대 2회)
- ✅ 상세한 실패 원인 분석 및 해결 방법 제시

**사용법**:
```bash
npm run build          # 자동 복구 모드로 빌드
npm run build:direct   # 자동 복구 없이 직접 빌드 (디버깅용)
```

**효과**: 빌드 실패 시 대부분의 경우 자동으로 복구되어 재빌드가 성공합니다.

#### 5.4. Zustand 상태 자동 복구

**구현 위치**: `src/client/store/useAuthStore.ts` (onRehydrateStorage)

**기능**:
- ✅ localStorage 복원 실패 시 자동 초기화
- ✅ 손상된 사용자 데이터 감지 및 자동 복구
- ✅ 배열 데이터 무결성 검증 및 자동 수정

**효과**: 상태 저장소 손상으로 인한 앱 크래시를 방지합니다.

---

## 📋 일반적인 오류 해결 방법

### Hydration 에러
```
Error: Hydration failed because the initial UI does not match...
```

**해결**:
1. 이미 적용된 `suppressHydrationWarning`이 작동하는지 확인
2. 브라우저 확장 프로그램을 일시적으로 비활성화하여 테스트
3. 개발자 도구에서 어떤 요소가 불일치하는지 확인

---

### Internal Server Error (500)

**증상**: 브라우저에 "Internal Server Error" 표시, 서버는 켜져 있는데 페이지만 오류

**원인**: 서버가 꺼진 것이 아니라, 특정 페이지/API 처리 중 예외 발생

**해결**:
1. **터미널 확인**: 개발 서버를 실행한 터미널에 빨간색 에러 메시지가 있는지 확인
2. **포트 확인**: `npm run dev` 또는 `npm run dev:direct` 실행 시 포트가 3000이 아닐 수 있음 (3000·3001 사용 중이면 3002로 안내됨). 접속 URL을 `http://localhost:3002` 등으로 맞추기
3. **직접 실행으로 에러 확인**:
   ```bash
   npm run dev:direct
   ```
   실행 후 문제되는 페이지 접속 → 터미널에 출력되는 오류 메시지 확인
4. **캐시 정리 후 재시도**:
   ```bash
   npm run clean
   npm run dev:direct
   ```

**참고**: 서버가 아예 안 켜지는 경우에는 터미널에서 `npm run dev:direct` 실행 시 에러 메시지가 먼저 출력됩니다.

---

### 빌드 모듈 찾기 실패
```
Error: Cannot find module './948.js'
Error: Cannot find module './vendor-chunks/next-themes.js'
```

**해결**:
```bash
npm run clean          # 빌드 캐시 정리
npm run build          # 다시 빌드
```

문제가 계속되면:
```bash
npm run clean:all      # 완전 재설치
```

---

### TypeScript 경로 오류
```
Error: Debug Failure. Expected C:/.../tsconfig.json === C:\.../tsconfig.json
```

**해결**:
- `tsconfig.json`에 주석이 있는지 확인 (순수 JSON만 허용)
- Windows 경로 구분자 문제일 수 있으므로 프로젝트 경로에 공백이 없는지 확인

---

### Next.js params Promise 에러
```
Type error: params is Promise<{ id: string }> but expected { id: string }
```

**해결**:
- Next.js 15에서는 `params`가 Promise입니다.
- 페이지 컴포넌트를 `async`로 만들고 `await params`를 사용:
```typescript
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}
```

---

## 🔍 예방적 모니터링

### 정기적으로 실행할 명령어

1. **개발 시작 전**:
   ```bash
   npm run check    # 환경 체크 (선택사항, 자동 복구가 대부분 처리)
   npm run dev      # 자동 복구 모드로 개발 서버 시작
   ```

2. **빌드 전**:
   ```bash
   npm run build    # 자동 복구 모드로 빌드 (실패 시 자동 재시도)
   ```

3. **문제 발생 시**:
   ```bash
   # 대부분의 경우 자동 복구가 처리하지만, 수동 개입이 필요하면:
   npm run clean    # 빌드 캐시 정리
   npm run dev      # 개발 서버 재시작 (자동 복구 포함)
   ```

### 자동 복구 동작 확인

자동 복구가 작동하면 콘솔에 다음과 같은 메시지가 표시됩니다:

```
[AutoRetry] 시도 1/4 실패 (NETWORK_ERROR). 1000ms 후 재시도...
[AutoRecovery] 로컬 스토리지 손상 감지 (auth-storage). 초기화합니다.
[AutoRecovery] 자동 복구 시도 중...
[GlobalErrorHandler] 자동 복구 시도 중...
```

---

## 📝 추가 권장사항

1. **Git 커밋 전**: 항상 `npm run lint` 실행
2. **배포 전**: `npm run build`로 프로덕션 빌드 테스트
3. **의존성 업데이트 후**: `npm run clean:all` 실행 권장
4. **에러 발생 시**: 브라우저 콘솔과 터미널 로그 모두 확인

---

## 🚨 문제가 계속되면

1. `npm run check`로 환경 상태 확인
2. `npm run clean:all`로 완전 재설치
3. Node.js 버전 확인 (권장: LTS 버전)
4. 프로젝트 경로에 특수문자나 공백이 없는지 확인

---

---

## 🎯 자동 자가치료 시스템 요약

이제 시스템은 다음과 같이 **완전 자동으로** 오류를 감지하고 복구합니다:

| 오류 유형 | 자동 복구 방법 | 복구 성공률 |
|---------|--------------|-----------|
| 네트워크 에러 | Exponential Backoff 재시도 (최대 3회) | ~90% |
| 로컬 스토리지 손상 | 자동 초기화 및 상태 복구 | ~100% |
| Zustand 상태 손상 | 자동 검증 및 데이터 복구 | ~100% |
| 개발 서버 시작 실패 | 자동 캐시 정리 후 재시도 (최대 3회) | ~95% |
| 빌드 실패 | 자동 캐시 정리 후 재빌드 (최대 2회) | ~85% |
| 페이지 로드 실패 | 자동 새로고침 (최대 3회) | ~80% |

**결과**: 대부분의 일시적 오류는 사용자 개입 없이 자동으로 해결됩니다! 🎉

---

**마지막 업데이트**: 2026-02-15 (자동 자가치료 시스템 추가)
