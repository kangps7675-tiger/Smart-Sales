-- ============================================================
-- 023: 매장주 가입 트랜잭션 함수 + DB 제약 조건
-- ============================================================
-- shops + profiles INSERT를 하나의 트랜잭션으로 묶어
-- 중간 실패 시 전부 롤백합니다.
-- ※ 이 스크립트는 여러 번 실행해도 안전합니다.

-- ============================================================
-- 1. DB 제약: tenant_admin은 반드시 shop_id가 있어야 함
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS tenant_must_have_shop;
ALTER TABLE profiles ADD CONSTRAINT tenant_must_have_shop
  CHECK (role != 'tenant_admin' OR shop_id IS NOT NULL);

-- ============================================================
-- 2. 매장주 가입 트랜잭션 함수
-- ============================================================
CREATE OR REPLACE FUNCTION create_tenant_admin(
  p_login_id   text,
  p_password_hash text,
  p_name       text,
  p_shop_name  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_shop_id    uuid;
  new_profile_id uuid;
  new_profile    record;
BEGIN
  INSERT INTO shops (name)
  VALUES (p_shop_name)
  RETURNING id INTO new_shop_id;

  INSERT INTO profiles (login_id, password_hash, name, role, shop_id)
  VALUES (p_login_id, p_password_hash, p_name, 'tenant_admin', new_shop_id)
  RETURNING id, name, role, shop_id INTO new_profile;

  RETURN jsonb_build_object(
    'id',      new_profile.id,
    'name',    new_profile.name,
    'role',    new_profile.role,
    'shop_id', new_profile.shop_id
  );
END;
$$;

COMMENT ON FUNCTION create_tenant_admin IS '매장주 가입: shop 생성 + profile 생성을 단일 트랜잭션으로 처리';
