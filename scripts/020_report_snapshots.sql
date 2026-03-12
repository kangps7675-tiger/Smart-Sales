-- 판매일보 스냅샷 저장/불러오기 기능
-- Supabase SQL Editor에서 실행

-- 1) 스냅샷 메타 테이블
CREATE TABLE IF NOT EXISTS public.report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  entry_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_shop ON public.report_snapshots(shop_id);

COMMENT ON TABLE public.report_snapshots IS '판매일보 스냅샷 메타정보. 저장 시점의 이름·건수·생성자를 기록';

-- 2) 스냅샷 엔트리 테이블 (실제 데이터, 1:N)
CREATE TABLE IF NOT EXISTS public.report_snapshot_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.report_snapshots(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_report_snapshot_entries_snap ON public.report_snapshot_entries(snapshot_id);

COMMENT ON TABLE public.report_snapshot_entries IS '스냅샷에 포함된 개별 판매일보 행. snapshot 삭제 시 CASCADE로 함께 제거';
