-- 캘린더 일자별 투두 (사용자별)
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS calendar_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  todo_date date NOT NULL,
  content text NOT NULL DEFAULT '',
  highlight smallint NOT NULL DEFAULT 0 CHECK (highlight >= 0 AND highlight <= 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_todos_profile_date ON calendar_todos(profile_id, todo_date);
COMMENT ON TABLE calendar_todos IS '캘린더 일자별 투두 (사용자별). highlight 0=없음, 1~3=강조 3단계';
