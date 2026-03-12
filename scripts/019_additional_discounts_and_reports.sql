-- 추가 할인 항목 정의 (매장별) + 판매일보에 적용된 추가 할인 저장
-- Supabase SQL Editor에서 실행

-- 1) 추가 할인 마스터 테이블 (매장주·판매사가 등록하는 할인 항목)
CREATE TABLE IF NOT EXISTS public.additional_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_additional_discounts_shop_id ON public.additional_discounts(shop_id);

COMMENT ON TABLE public.additional_discounts IS '매장별 추가 할인 항목 (재량 할인). 판매일보에서 드롭다운으로 선택해 층층이 적용';

-- 2) reports 테이블에 추가 할인 적용 내역 컬럼
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS additional_discount_ids jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS additional_discount_amount numeric DEFAULT 0;

COMMENT ON COLUMN public.reports.additional_discount_ids IS '적용된 추가 할인 항목 id 배열 (uuid 문자열)';
COMMENT ON COLUMN public.reports.additional_discount_amount IS '적용된 추가 할인 합계 (정책 마진에서 차감되는 금액)';
