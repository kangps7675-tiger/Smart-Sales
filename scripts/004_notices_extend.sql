-- notices 테이블 확장: 글 유형(type) 추가
-- Supabase SQL Editor에서 실행

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notices'
      AND column_name = 'type'
  ) THEN
    ALTER TABLE notices
      ADD COLUMN type text NOT NULL DEFAULT 'notice';
  END IF;
END $$;

ALTER TABLE notices
  ADD CONSTRAINT notices_type_check
  CHECK (type IN ('notice', 'post'));

COMMENT ON COLUMN notices.type IS '글 유형: notice(공지), post(일반 글 등)';

