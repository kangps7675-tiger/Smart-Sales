-- CRM 상담 유입 유형 (유입 통계용)
-- Supabase SQL Editor에서 실행

ALTER TABLE public.crm_consultations
  ADD COLUMN IF NOT EXISTS inflow_type text NULL;

COMMENT ON COLUMN public.crm_consultations.inflow_type IS '유입 통계 분류: 로드, 컨택, 전화, 온라인, 지인';
