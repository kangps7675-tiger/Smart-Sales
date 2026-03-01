-- profiles에 지점장(region_manager)용 컬럼 추가
-- 로그인/가입 시 "column managed_store_group_id does not exist" 오류가 나면
-- Supabase SQL Editor에서 이 스크립트를 실행하세요. (store_groups가 없으면 먼저 생성)

CREATE TABLE IF NOT EXISTS store_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_group_id uuid REFERENCES store_groups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'managed_store_group_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN managed_store_group_id uuid REFERENCES store_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_managed_store_group ON profiles(managed_store_group_id);
COMMENT ON COLUMN profiles.managed_store_group_id IS '지점장(region_manager)일 때 관리하는 지점(store_groups.id)';
