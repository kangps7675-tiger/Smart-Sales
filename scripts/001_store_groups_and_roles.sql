-- 4단계 권한 구조: 본사 → 지역/지점 → 매장주 → 판매사
-- Supabase SQL Editor에서 실행 후, 기존 profiles.shop_id는 수동으로 shops.id와 맞춰주거나 마이그레이션 필요 시 별도 처리.

-- 1) 지역/지점 그룹
CREATE TABLE IF NOT EXISTS store_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_group_id uuid REFERENCES store_groups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_groups_parent ON store_groups(parent_group_id);
COMMENT ON TABLE store_groups IS '지역/지점 그룹 (REGION_MANAGER가 관리하는 단위)';

-- 2) 매장 (기존 shop 개념을 DB로)
CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  store_group_id uuid REFERENCES store_groups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 기존 shops 테이블에 store_group_id가 없으면 추가 (이미 있을 때 CREATE TABLE이 스킵되므로)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'store_group_id'
  ) THEN
    ALTER TABLE shops ADD COLUMN store_group_id uuid REFERENCES store_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shops_store_group ON shops(store_group_id);
COMMENT ON TABLE shops IS '매장 (STORE_OWNER가 관리하는 단위)';

-- 3) profiles에 지점장용 컬럼 추가
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

-- 4) role에 region_manager 허용 (기존 CHECK 제약이 있으면 제거 후 추가)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'profiles' AND constraint_name LIKE '%role%'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  END IF;
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'region_manager', 'tenant_admin', 'staff'));

COMMENT ON COLUMN profiles.managed_store_group_id IS '지점장(region_manager)일 때 관리하는 지점 ID';
