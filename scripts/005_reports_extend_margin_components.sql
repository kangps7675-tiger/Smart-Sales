-- 판매일보(reports) 테이블에 스프레드시트 마진 계산 구성요소 컬럼 추가
-- 출고가, 공시지원, 할부원금/개월, 액면, 구두 A~F

alter table public.reports
  add column if not exists factory_price numeric null,
  add column if not exists official_subsidy numeric null,
  add column if not exists installment_principal numeric null,
  add column if not exists installment_months integer null,
  add column if not exists face_amount numeric null,
  add column if not exists verbal_a numeric null,
  add column if not exists verbal_b numeric null,
  add column if not exists verbal_c numeric null,
  add column if not exists verbal_d numeric null,
  add column if not exists verbal_e numeric null,
  add column if not exists verbal_f numeric null;

