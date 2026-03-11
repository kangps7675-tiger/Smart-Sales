-- 판매일보(reports)에 주소·유입경로 컬럼 추가
-- Supabase Dashboard > SQL Editor에서 실행

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS address text NULL,
  ADD COLUMN IF NOT EXISTS path text NULL;

COMMENT ON COLUMN public.reports.address IS '고객 주소';
COMMENT ON COLUMN public.reports.path IS '유입 경로';
