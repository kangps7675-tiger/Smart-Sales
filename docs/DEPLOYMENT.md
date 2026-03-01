# 배포/운영 가이드

## 환경변수 (Vercel)

### `SUPER_ADMIN_SIGNUP_PASSWORD`

- **용도**: `super_admin` 계정 생성(회원가입) 시 비밀번호(시크릿) 검증에 사용됩니다.
- **위치**: `POST /api/auth/signup`에서 검사합니다.
- **설정 방법**: Vercel 프로젝트 → Settings → Environment Variables에서 `SUPER_ADMIN_SIGNUP_PASSWORD` 추가

#### 주의

- 이 값은 **절대 클라이언트에 노출되면 안 됩니다.**
- 반드시 **강한 랜덤 문자열**로 설정하세요.
- 운영 환경에서는 super admin 가입을 막거나, 별도 관리 플로우(초기 1회만 허용 등)를 권장합니다.

### `SESSION_SECRET`

- **용도**: httpOnly 세션 쿠키(`ps_session`) 서명/검증에 사용됩니다.
- **위치**: `src/server/session.ts`에서 사용하며, 로그인 시 발급되는 세션 토큰의 무결성을 보장합니다.
- **설정 방법**: Vercel 프로젝트 → Settings → Environment Variables에서 `SESSION_SECRET` 추가
  - 예: `openssl rand -base64 32` 등으로 생성한 32바이트 이상 랜덤 문자열

#### 주의

- 절대 클라이언트에 노출되면 안 됩니다.
- 운영 환경에서 변경하면, 변경 시점 이전의 모든 세션이 무효화됩니다.

---

## Supabase 마이그레이션 실행

- `scripts/001_store_groups_and_roles.sql`  
  - **`managed_store_group_id does not exist` 오류가 나면** `scripts/001b_profiles_managed_store_group_id.sql`를 Supabase SQL Editor에서 실행하세요.
- `scripts/002_shop_settings.sql`
- `scripts/salary_snapshots-table.sql` (급여 스냅샷 저장을 쓰는 경우)

Supabase SQL Editor에서 위 스크립트를 순서대로 실행하세요.

추가 마이그레이션(필요 시):

- `scripts/004_notices_extend.sql` (공지 type)
- `scripts/005_reports_extend_margin_components.sql` (판매일보 마진 구성요소)
- `scripts/006_notice_comments.sql` (댓글·대댓글)
- `scripts/007_crm_consultations.sql` (CRM 상담 + 개통여부)
- `scripts/008_reports_extend_detail_columns.sql` (판매일보 세부: 검수/복지/유무선 등)
- `scripts/010_reports_activation_time.sql` (개통 시간)
- `scripts/011_crm_customers.sql` (CRM 고객 마스터, 판매일보 업로드 시 자동 수집)
- `scripts/012_crm_consultations_inflow_type.sql` (상담 유입 유형, 유입/개통 통계용)
- `scripts/013_calendar_todos.sql` (캘린더 일자별 투두)
- `scripts/014_password_reset_tokens.sql` (비밀번호 찾기 재설정 토큰)
- `scripts/015_manager_login_timestamps.sql` (매장주/지점장 먼저 로그인 후 판매사 로그인 허용용)

---

## 보안(RLS)

현재 앱은 **Next API Route에서 Supabase service role(admin) 키**로만 DB에 접근합니다.  
이 경우 **RLS(Row Level Security)는 적용되지 않습니다** (service role은 RLS를 우회).

- **RLS 적용 시점**: Supabase Auth를 직접 사용해 클라이언트에서 anon 키로 쿼리할 때, 또는 “DB 직접 접근”을 막고 API만 열 때 정책을 두고 싶을 때.
- **예시 스크립트**: `scripts/003_rls_policies.sql` (profiles, shops, reports 등), `scripts/009_rls_notice_crm.sql` (notice_comments, crm_consultations).
- **전제**: `auth.uid()`와 `profiles.id`가 1:1 매핑되어 있어야 하며, `v_current_profile` 뷰가 있어야 합니다.
- **운영 반영**: 스테이징에서 먼저 테스트한 뒤, 실제 운영 환경에 맞게 정책을 조정해 적용하세요.

