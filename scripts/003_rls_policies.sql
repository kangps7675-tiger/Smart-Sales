-- RLS 정책 (Supabase Auth 연동 시 사용)
-- 현재는 Next API Route에서 service role 키로만 접근하므로, 실제 RLS는 비활성 상태일 수 있습니다.
-- 추후 Supabase Auth(anon 키) + client 직접 쿼리로 전환할 때 이 스크립트를 기반으로 조정하세요.
-- ※ 이 스크립트는 여러 번 실행해도 안전합니다 (DROP IF EXISTS 사용).

-- 전제:
-- - auth.users.id = profiles.id (Supabase Auth와 profiles가 1:1 매핑된 구조)
-- - profiles.role IN ('super_admin', 'tenant_admin', 'staff')
-- - profiles.shop_id 컬럼이 존재

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;

-- salary_snapshots 테이블이 존재할 때만 RLS 활성화
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='salary_snapshots') THEN
    EXECUTE 'ALTER TABLE salary_snapshots ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- 기존 정책/뷰 정리 (재실행 안전)
DROP POLICY IF EXISTS profiles_select_self ON profiles;
DROP POLICY IF EXISTS profiles_update_self ON profiles;
DROP POLICY IF EXISTS reports_select_by_scope ON reports;
DROP POLICY IF EXISTS reports_insert_by_scope ON reports;
DROP VIEW IF EXISTS v_current_profile CASCADE;

-- 헬퍼 뷰: 현재 요청자의 role/shop 가져오기
-- security_invoker=true → 조회자(호출자)의 권한으로 실행 (Supabase Linter 권장)
CREATE VIEW v_current_profile
  WITH (security_invoker = true)
AS
SELECT p.*
FROM profiles p
WHERE p.id = auth.uid();

-- PROFILES: 자기 자신의 프로필만 조회/수정 (super_admin은 전체)
CREATE POLICY profiles_select_self
ON profiles
FOR SELECT
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM v_current_profile cp WHERE cp.role = 'super_admin'
  )
);

CREATE POLICY profiles_update_self
ON profiles
FOR UPDATE
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM v_current_profile cp WHERE cp.role = 'super_admin'
  )
);

-- REPORTS: 매장 스코프 기반
CREATE POLICY reports_select_by_scope
ON reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM v_current_profile cp
    WHERE
      cp.role = 'super_admin'
      OR (cp.role IN ('tenant_admin', 'staff') AND cp.shop_id = reports.shop_id)
  )
);

CREATE POLICY reports_insert_by_scope
ON reports
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM v_current_profile cp
    WHERE
      cp.role = 'super_admin'
      OR (cp.role IN ('tenant_admin', 'staff') AND cp.shop_id = reports.shop_id)
  )
);

-- 기타 테이블(salary_snapshots, shop_settings 등)은 reports와 유사하게
-- shop_id 스코프를 기준으로 정책을 작성하면 됩니다.
