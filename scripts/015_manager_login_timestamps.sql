-- 매장주/지점장 로그인 시각 기록 (판매사는 이 로그인 이후에만 로그인 가능)
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS manager_login_timestamps (
  scope_type text NOT NULL CHECK (scope_type IN ('shop', 'store_group')),
  scope_id uuid NOT NULL,
  last_login_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_login_timestamps_last ON manager_login_timestamps(last_login_at DESC);
COMMENT ON TABLE manager_login_timestamps IS '매장주(shop) 또는 지점장(store_group) 로그인 시각. 판매사는 최근 로그인 이후에만 로그인 가능';
