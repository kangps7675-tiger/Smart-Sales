-- 직원 급여 이력 저장용 테이블 (Supabase SQL Editor에서 실행)
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS salary_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  sales_person text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  sale_count int NOT NULL DEFAULT 0,
  total_margin bigint NOT NULL DEFAULT 0,
  total_support bigint NOT NULL DEFAULT 0,
  calculated_salary bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_snapshots_shop_id ON salary_snapshots(shop_id);
CREATE INDEX IF NOT EXISTS idx_salary_snapshots_sales_person ON salary_snapshots(sales_person);
CREATE INDEX IF NOT EXISTS idx_salary_snapshots_period ON salary_snapshots(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_salary_snapshots_created_at ON salary_snapshots(created_at DESC);

COMMENT ON TABLE salary_snapshots IS '판매사별 급여 스냅샷 이력 (정산 저장 시 한 건씩 추가)';
