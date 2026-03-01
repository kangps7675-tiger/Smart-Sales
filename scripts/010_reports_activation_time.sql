-- 판매일보(reports) 스프레드시트 정합: 개통 시간
-- Supabase SQL Editor에서 실행

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS activation_time text NULL;

COMMENT ON COLUMN public.reports.activation_time IS '개통 시간';
