-- RLS 확장: notice_comments, crm_consultations
-- 003_rls_policies.sql 적용 후, Supabase Auth 연동 시 함께 사용
-- 현재 앱은 API Route에서 service role로 접근하므로 RLS가 적용되어 있어도 service role은 bypass 합니다.
-- ※ 이 스크립트는 여러 번 실행해도 안전합니다 (DROP IF EXISTS 사용).

-- notice_comments
ALTER TABLE notice_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notice_comments_select ON notice_comments;
DROP POLICY IF EXISTS notice_comments_insert ON notice_comments;
DROP POLICY IF EXISTS notice_comments_delete ON notice_comments;

CREATE POLICY notice_comments_select
ON notice_comments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY notice_comments_insert
ON notice_comments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY notice_comments_delete
ON notice_comments FOR DELETE
USING (
  auth.uid() = author_id
  OR EXISTS (SELECT 1 FROM v_current_profile cp WHERE cp.role IN ('super_admin', 'tenant_admin'))
);

-- crm_consultations
ALTER TABLE crm_consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_consultations_select ON crm_consultations;
DROP POLICY IF EXISTS crm_consultations_insert ON crm_consultations;
DROP POLICY IF EXISTS crm_consultations_update ON crm_consultations;
DROP POLICY IF EXISTS crm_consultations_delete ON crm_consultations;

CREATE POLICY crm_consultations_select
ON crm_consultations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM v_current_profile cp
    WHERE
      cp.role = 'super_admin'
      OR (cp.role IN ('tenant_admin', 'staff') AND cp.shop_id = crm_consultations.shop_id)
  )
);

CREATE POLICY crm_consultations_insert
ON crm_consultations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM v_current_profile cp
    WHERE
      cp.role = 'super_admin'
      OR (cp.role IN ('tenant_admin', 'staff') AND cp.shop_id = crm_consultations.shop_id)
  )
);

CREATE POLICY crm_consultations_update
ON crm_consultations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM v_current_profile cp
    WHERE
      cp.role = 'super_admin'
      OR (cp.role IN ('tenant_admin', 'staff') AND cp.shop_id = crm_consultations.shop_id)
  )
);

CREATE POLICY crm_consultations_delete
ON crm_consultations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM v_current_profile cp
    WHERE
      cp.role = 'super_admin'
      OR (cp.role IN ('tenant_admin', 'staff') AND cp.shop_id = crm_consultations.shop_id)
  )
);
