-- 비밀번호 재설정용 일회용 토큰 (비밀번호 찾기)
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token text PRIMARY KEY,
  profile_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_profile_id ON password_reset_tokens(profile_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
COMMENT ON TABLE password_reset_tokens IS '비밀번호 찾기 시 발급되는 일회용 재설정 토큰 (만료 후 삭제 권장)';
