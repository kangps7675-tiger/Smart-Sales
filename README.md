# 휴대폰 매장 통합 관리 SaaS (가칭: Smart Sales SaaS)

구독형 웹 기반 통합 관리 시스템 — 상담·견적·판매 일보를 한 흐름으로 연결합니다.

## 실행 방법

```bash
npm install
npm run dev
```

- **랜딩**: http://localhost:3000 (Hero → 무료로 시작하기 → 대시보드)  
- **대시보드**: http://localhost:3000/dashboard  
- **새 계약·상담**: http://localhost:3000/dashboard/contract/new  

**다크 모드**: 우측 상단 토글로 전환 가능 (시스템 설정 자동 반영).  
**숫자 입력**: IMEI 등 숫자 필드는 모바일에서 숫자 키패드가 뜨도록 최적화되어 있습니다.

## 프로젝트 구조 (클라이언트 / 서버 구분)

| 구분 | 경로 | 설명 |
|------|------|------|
| **클라이언트** | `src/client/` | 브라우저 전용: `components/`, `pages/`, `store/` |
| **서버** | `src/server/` | 서버 전용: API·DB·인증 로직 (추후 구현) |
| **앱** | `src/app/` | Next.js 라우트. 페이지는 `@/client/pages/*` 를 re-export |

- **client**: `components`(UI), `pages`(화면 컴포넌트), `store`(Zustand)
- **server**: 클라이언트에서 직접 import 하지 말고, `app/api/` 또는 Server Action으로만 호출

## 문서 위치

- **화면 구현 마스터 프롬프트**: [docs/PRD-마스터-프롬프트-화면구현.md](./docs/PRD-마스터-프롬프트-화면구현.md)  
  → Cursor 바이브 코딩 시 위 문서의 "Cursor용 마스터 프롬프트" 블록을 복사해 사용하세요.

## 예정 기술 스택

- **Front**: Next.js 14, Tailwind CSS, shadcn/ui, Zustand
- **Back**: PostgreSQL, Supabase Auth, 실시간 알림, PortOne(구독 결제)

## 로드맵

1. **Phase 1**: 20개 항목 그룹화 및 와이어프레임 (2/18 미팅)
2. **Phase 2 (Alpha)**: 견적기 + 정책 관리자
3. **Phase 3 (Beta)**: 실제 매장 테스트, 판매 일보 연동
4. **Phase 4 (Launch)**: 결제 연동, 타 매장 SaaS 런칭
