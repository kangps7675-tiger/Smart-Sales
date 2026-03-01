-- 판매일보(reports) 세부 컬럼: 검수, 복지/보험/카드/결합, 유무선·유형·일련번호
-- Supabase SQL Editor에서 실행

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS inspection_store text NULL,
  ADD COLUMN IF NOT EXISTS inspection_office text NULL,
  ADD COLUMN IF NOT EXISTS welfare text NULL,
  ADD COLUMN IF NOT EXISTS insurance text NULL,
  ADD COLUMN IF NOT EXISTS card text NULL,
  ADD COLUMN IF NOT EXISTS combined text NULL,
  ADD COLUMN IF NOT EXISTS line_type text NULL,
  ADD COLUMN IF NOT EXISTS sale_type text NULL,
  ADD COLUMN IF NOT EXISTS serial_number text NULL;

COMMENT ON COLUMN public.reports.inspection_store IS '매장 검수';
COMMENT ON COLUMN public.reports.inspection_office IS '사무실 검수';
COMMENT ON COLUMN public.reports.welfare IS '복지';
COMMENT ON COLUMN public.reports.insurance IS '보험';
COMMENT ON COLUMN public.reports.card IS '카드';
COMMENT ON COLUMN public.reports.combined IS '결합';
COMMENT ON COLUMN public.reports.line_type IS '유무선 (유선/무선 등)';
COMMENT ON COLUMN public.reports.sale_type IS '유형';
COMMENT ON COLUMN public.reports.serial_number IS '일련번호';
