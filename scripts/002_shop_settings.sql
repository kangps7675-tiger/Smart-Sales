-- 매장별 설정: 마진률, 실적 목표 등
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS shop_settings (
  shop_id uuid PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
  margin_rate_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (margin_rate_pct >= 0 AND margin_rate_pct <= 100),
  sales_target_monthly integer NOT NULL DEFAULT 0 CHECK (sales_target_monthly >= 0),
  per_sale_incentive integer NOT NULL DEFAULT 30000 CHECK (per_sale_incentive >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE shop_settings IS '매장별 마진률·실적 목표·건당 인센티브';
COMMENT ON COLUMN shop_settings.margin_rate_pct IS '마진의 N%를 급여에 반영 (0~100)';
COMMENT ON COLUMN shop_settings.sales_target_monthly IS '월 실적 목표 건수';
COMMENT ON COLUMN shop_settings.per_sale_incentive IS '건당 인센티브 (원)';

-- 구독 상태: shops에 컬럼 추가 (선택)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE shops ADD COLUMN subscription_status text NOT NULL DEFAULT 'active'
      CHECK (subscription_status IN ('active', 'trial', 'suspended'));
  END IF;
END $$;

COMMENT ON COLUMN shops.subscription_status IS '구독 상태: active, trial, suspended';
