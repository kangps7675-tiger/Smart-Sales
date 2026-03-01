-- profiles에 로그인용 컬럼 추가 (login_id, password_hash)
-- "column login_id does not exist" / "Invalid credentials" 시
-- Supabase SQL Editor에서 이 스크립트를 실행하세요.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'login_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN login_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE profiles ADD COLUMN password_hash text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_login_id ON profiles(login_id) WHERE login_id IS NOT NULL;
COMMENT ON COLUMN profiles.login_id IS '로그인 아이디 (회원가입 시 설정, 로그인 API에서 사용)';
COMMENT ON COLUMN profiles.password_hash IS 'bcrypt 해시 (회원가입 시 저장, 로그인 검증에 사용)';
