-- 캘린더 휴가/휴일 설정 (사용자별 일자)
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS calendar_leave (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  leave_date date NOT NULL,
  label text DEFAULT '휴가',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, leave_date)
);

CREATE INDEX IF NOT EXISTS idx_calendar_leave_profile_date ON calendar_leave(profile_id, leave_date);
COMMENT ON TABLE calendar_leave IS '캘린더 휴가 설정 (사용자별 일자). label 예: 휴가, 반차, 외출 등';
