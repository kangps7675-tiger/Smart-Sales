-- CRM 고객 마스터: 판매일보·상담에서 자동 수집된 고객
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS crm_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_customers_shop_id ON crm_customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_crm_customers_name ON crm_customers(name);
COMMENT ON TABLE crm_customers IS 'CRM 고객 마스터. 판매일보·상담에서 자동 수집 또는 직접 등록';
