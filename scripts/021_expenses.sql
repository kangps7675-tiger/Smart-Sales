-- 지출 내역 관리 (매장별, 판매사 메모 + 매장주 종합 조회)
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id text NOT NULL,
  profile_id uuid NOT NULL,
  buyer_name text NOT NULL DEFAULT '',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_shop_date ON public.expenses(shop_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_profile ON public.expenses(profile_id);

COMMENT ON TABLE public.expenses IS '매장별 지출 내역. 판매사가 등록하고 매장주가 종합 조회·자동 합산';
COMMENT ON COLUMN public.expenses.buyer_name IS '구매자 이름 (프로필에서 자동 채움)';
COMMENT ON COLUMN public.expenses.description IS '적요 (폰와따몰, 퀵, 다이소 등)';
COMMENT ON COLUMN public.expenses.amount IS '지출 금액';
