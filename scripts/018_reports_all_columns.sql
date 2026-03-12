-- 판매일보(reports) 테이블에 앱/엑셀 업로드에서 쓰는 컬럼 전부 추가
-- Supabase Dashboard > SQL Editor에서 한 번만 실행하면 됩니다.
-- (이미 있는 컬럼은 ADD COLUMN IF NOT EXISTS 로 스킵됩니다.)

-- 기본 고객/판매
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS name text NULL,
  ADD COLUMN IF NOT EXISTS phone text NULL,
  ADD COLUMN IF NOT EXISTS birth_date text NULL,
  ADD COLUMN IF NOT EXISTS address text NULL,
  ADD COLUMN IF NOT EXISTS path text NULL,
  ADD COLUMN IF NOT EXISTS existing_carrier text NULL,
  ADD COLUMN IF NOT EXISTS sale_date text NULL,
  ADD COLUMN IF NOT EXISTS product_name text NULL,
  ADD COLUMN IF NOT EXISTS amount numeric NULL,
  ADD COLUMN IF NOT EXISTS margin numeric NULL,
  ADD COLUMN IF NOT EXISTS sales_person text NULL,
  ADD COLUMN IF NOT EXISTS plan_name text NULL,
  ADD COLUMN IF NOT EXISTS support_amount numeric NULL;

-- 마진 구성요소 (005)
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS factory_price numeric NULL,
  ADD COLUMN IF NOT EXISTS official_subsidy numeric NULL,
  ADD COLUMN IF NOT EXISTS installment_principal numeric NULL,
  ADD COLUMN IF NOT EXISTS installment_months integer NULL,
  ADD COLUMN IF NOT EXISTS face_amount numeric NULL,
  ADD COLUMN IF NOT EXISTS verbal_a numeric NULL,
  ADD COLUMN IF NOT EXISTS verbal_b numeric NULL,
  ADD COLUMN IF NOT EXISTS verbal_c numeric NULL,
  ADD COLUMN IF NOT EXISTS verbal_d numeric NULL,
  ADD COLUMN IF NOT EXISTS verbal_e numeric NULL,
  ADD COLUMN IF NOT EXISTS verbal_f numeric NULL;

-- 세부/검수/유형 (008, 010)
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS activation_time text NULL,
  ADD COLUMN IF NOT EXISTS inspection_store text NULL,
  ADD COLUMN IF NOT EXISTS inspection_office text NULL,
  ADD COLUMN IF NOT EXISTS welfare text NULL,
  ADD COLUMN IF NOT EXISTS insurance text NULL,
  ADD COLUMN IF NOT EXISTS card text NULL,
  ADD COLUMN IF NOT EXISTS combined text NULL,
  ADD COLUMN IF NOT EXISTS line_type text NULL,
  ADD COLUMN IF NOT EXISTS sale_type text NULL,
  ADD COLUMN IF NOT EXISTS serial_number text NULL;
