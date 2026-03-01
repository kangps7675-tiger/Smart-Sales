-- 공지/게시글 댓글·대댓글 테이블
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS notice_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES notice_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notice_comments_notice_id ON notice_comments(notice_id);
CREATE INDEX IF NOT EXISTS idx_notice_comments_parent_id ON notice_comments(parent_id);

COMMENT ON TABLE notice_comments IS '공지/게시글 댓글·대댓글 (parent_id 있으면 대댓글)';
COMMENT ON COLUMN notice_comments.body IS '댓글 본문. @이름 형태 멘션 포함 가능';
