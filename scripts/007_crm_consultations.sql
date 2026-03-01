-- CRM 상담 로우 + 개통여부(O/△/X). O → 판매일보, △ → 예정건
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS crm_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  product_name text,
  memo text,
  consultation_date date NOT NULL DEFAULT (current_date),
  sales_person text,
  activation_status text NOT NULL DEFAULT 'X' CHECK (activation_status IN ('O', '△', 'X')),
  report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_consultations_shop_id ON crm_consultations(shop_id);
CREATE INDEX IF NOT EXISTS idx_crm_consultations_activation_status ON crm_consultations(activation_status);
CREATE INDEX IF NOT EXISTS idx_crm_consultations_consultation_date ON crm_consultations(consultation_date);

COMMENT ON TABLE crm_consultations IS 'CRM 상담 로우. 개통여부 O=판매일보 이동, △=예정건, X=미개통';
COMMENT ON COLUMN crm_consultations.activation_status IS 'O: 개통(판매일보 이동), △: 예정건, X: 미개통';
COMMENT ON COLUMN crm_consultations.report_id IS 'O로 전환 후 판매일보로 이동 시 생성된 reports.id';
