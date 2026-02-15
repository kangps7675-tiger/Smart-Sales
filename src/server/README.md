# Server (서버)

브라우저에서 실행되지 않는 코드만 두는 영역입니다.

- **API 라우트**: `src/app/api/` 에서 라우트 파일을 두고, 비즈니스 로직·DB 호출은 이 폴더의 모듈을 import 해서 사용
- **DB·Supabase·MongoDB**: 접속, 쿼리, 스키마 관련 코드
- **인증·권한**: 세션 검증, RLS 등 서버 전용 로직

클라이언트에서는 `@/server/*` 모듈을 직접 import 하지 마세요. API Route 또는 Server Action을 통해만 서버 코드를 호출합니다.
