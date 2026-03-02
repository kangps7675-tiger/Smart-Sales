-- 매장별 엑셀/시트 가져오기 설정 (컬럼 매핑, 마진 계산 방식)
-- Supabase SQL Editor에서 실행

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS report_import_config jsonb NULL;

COMMENT ON COLUMN public.shop_settings.report_import_config IS '엑셀 가져오기 설정: columnMapping(엑셀헤더->내부필드), marginFormula(use_column|sum_fields), marginSumFields(합산할 필드 목록). null이면 기본 매핑 사용';
