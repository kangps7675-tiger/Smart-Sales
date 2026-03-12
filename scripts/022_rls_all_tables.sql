-- ============================================================
-- 022: 모든 public 테이블 RLS 활성화 + 기본 정책
-- ============================================================
-- 현재 앱은 API Route에서 service_role 키로 접근하므로 RLS를 bypass 합니다.
-- 이 스크립트는 Supabase Linter 경고 해소 및 보안 강화 목적입니다.
-- service_role 접근에는 영향 없고, anon/authenticated 직접 쿼리 시에만 적용됩니다.
-- ※ 이 스크립트는 여러 번 실행해도 안전합니다 (DROP IF EXISTS 사용).
--
-- 실행 전제: 003_rls_policies.sql (v_current_profile 뷰 + profiles/shops/reports RLS)
--            009_rls_notice_crm.sql (notice_comments/crm_consultations RLS) 적용 완료

-- ============================================================
-- 1. RLS ENABLE
-- ============================================================
ALTER TABLE device_policies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_policies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_policies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_policies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites                ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_uploads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_login_timestamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices                ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_todos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_discounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_snapshot_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='salary_snapshots') THEN
    EXECUTE 'ALTER TABLE salary_snapshots ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ============================================================
-- 2. 기존 정책 정리 (재실행 안전)
-- ============================================================
DROP POLICY IF EXISTS device_policies_all ON device_policies;
DROP POLICY IF EXISTS device_policies_service_only ON device_policies;
DROP POLICY IF EXISTS plan_policies_all ON plan_policies;
DROP POLICY IF EXISTS plan_policies_service_only ON plan_policies;
DROP POLICY IF EXISTS addon_policies_all ON addon_policies;
DROP POLICY IF EXISTS addon_policies_service_only ON addon_policies;
DROP POLICY IF EXISTS salary_policies_all ON salary_policies;
DROP POLICY IF EXISTS salary_policies_service_only ON salary_policies;
DROP POLICY IF EXISTS invites_all ON invites;
DROP POLICY IF EXISTS invites_service_only ON invites;
DROP POLICY IF EXISTS report_uploads_all ON report_uploads;
DROP POLICY IF EXISTS report_uploads_service_only ON report_uploads;
DROP POLICY IF EXISTS additional_discounts_all ON additional_discounts;
DROP POLICY IF EXISTS additional_discounts_service_only ON additional_discounts;
DROP POLICY IF EXISTS expenses_all ON expenses;
DROP POLICY IF EXISTS expenses_service_only ON expenses;
DROP POLICY IF EXISTS report_snapshots_all ON report_snapshots;
DROP POLICY IF EXISTS report_snapshots_service_only ON report_snapshots;
DROP POLICY IF EXISTS report_snapshot_entries_all ON report_snapshot_entries;
DROP POLICY IF EXISTS report_snapshot_entries_service_only ON report_snapshot_entries;
DROP POLICY IF EXISTS crm_customers_all ON crm_customers;
DROP POLICY IF EXISTS crm_customers_service_only ON crm_customers;
DROP POLICY IF EXISTS calendar_todos_all ON calendar_todos;
DROP POLICY IF EXISTS calendar_todos_service_only ON calendar_todos;
DROP POLICY IF EXISTS notices_select ON notices;
DROP POLICY IF EXISTS notices_insert ON notices;
DROP POLICY IF EXISTS notices_update ON notices;
DROP POLICY IF EXISTS notices_delete ON notices;
DROP POLICY IF EXISTS notices_service_only ON notices;
DROP POLICY IF EXISTS store_groups_all ON store_groups;
DROP POLICY IF EXISTS store_groups_service_only ON store_groups;
DROP POLICY IF EXISTS password_reset_tokens_deny_all ON password_reset_tokens;
DROP POLICY IF EXISTS password_reset_tokens_service_only ON password_reset_tokens;
DROP POLICY IF EXISTS manager_login_timestamps_select ON manager_login_timestamps;
DROP POLICY IF EXISTS manager_login_timestamps_insert ON manager_login_timestamps;
DROP POLICY IF EXISTS manager_login_timestamps_service_only ON manager_login_timestamps;

-- ============================================================
-- 3. 모든 테이블: service_role 전용 (USING false)
-- ============================================================
-- 앱이 100% service_role 키로 API Route를 통해 접근하므로,
-- 모든 테이블을 일반 사용자(anon/authenticated) 접근 차단으로 설정합니다.
-- service_role은 RLS를 bypass하므로 앱 동작에 영향 없습니다.
-- 추후 클라이언트 직접 쿼리로 전환 시 테이블별 정책을 세분화하세요.

CREATE POLICY device_policies_service_only ON device_policies FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY plan_policies_service_only ON plan_policies FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY addon_policies_service_only ON addon_policies FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY salary_policies_service_only ON salary_policies FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY invites_service_only ON invites FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY report_uploads_service_only ON report_uploads FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY additional_discounts_service_only ON additional_discounts FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY expenses_service_only ON expenses FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY report_snapshots_service_only ON report_snapshots FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY report_snapshot_entries_service_only ON report_snapshot_entries FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY crm_customers_service_only ON crm_customers FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY calendar_todos_service_only ON calendar_todos FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY notices_service_only ON notices FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY store_groups_service_only ON store_groups FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY password_reset_tokens_service_only ON password_reset_tokens FOR ALL
USING (false) WITH CHECK (false);

CREATE POLICY manager_login_timestamps_service_only ON manager_login_timestamps FOR ALL
USING (false) WITH CHECK (false);

-- ── shops / shop_settings (003에서 RLS 활성화됨, 정책 누락 보완) ──
DROP POLICY IF EXISTS shops_service_only ON shops;
CREATE POLICY shops_service_only ON shops FOR ALL
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS shop_settings_service_only ON shop_settings;
CREATE POLICY shop_settings_service_only ON shop_settings FOR ALL
USING (false) WITH CHECK (false);

-- salary_snapshots (존재 시에만)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='salary_snapshots') THEN
    EXECUTE 'DROP POLICY IF EXISTS salary_snapshots_all ON salary_snapshots';
    EXECUTE 'DROP POLICY IF EXISTS salary_snapshots_service_only ON salary_snapshots';
    EXECUTE 'CREATE POLICY salary_snapshots_service_only ON salary_snapshots FOR ALL USING (false) WITH CHECK (false)';
  END IF;
END $$;
