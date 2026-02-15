# Client (클라이언트)

브라우저에서 실행되는 코드만 두는 영역입니다.

- **components**: UI 컴포넌트 (`"use client"` 사용)
- **pages**: 페이지 단위 컴포넌트 (라우트별 화면). `src/app/` 에서 re-export
- **store**: Zustand 등 클라이언트 상태 (useContractStore 등)

서버 전용 로직(DB, API 핸들러)은 `src/server/` 에 두고, 여기서는 API Route를 **호출**만 합니다.
