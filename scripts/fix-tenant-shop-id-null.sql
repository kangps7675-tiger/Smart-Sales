-- shop_id가 NULL인 매장주(tenant_admin)에게 매장을 연결합니다.
-- Supabase SQL Editor에서 실행 전, 아래 두 값을 수정하세요.

DO $$
DECLARE
  new_shop_id uuid;
  target_login_id text := '여기에_로그인_아이디';  -- 예: mystore
  new_shop_name text := '내 매장';                 -- 새로 만들 매장 이름
  updated_count int;
BEGIN
  -- 새 매장 생성
  INSERT INTO shops (name) VALUES (new_shop_name) RETURNING id INTO new_shop_id;

  -- 해당 로그인 아이디의 매장주(tenant_admin) 프로필에 shop_id 설정
  UPDATE profiles
  SET shop_id = new_shop_id
  WHERE role = 'tenant_admin'
    AND shop_id IS NULL
    AND login_id = target_login_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count = 0 THEN
    RAISE NOTICE '해당 login_id(%)인 tenant_admin이 없거나 이미 shop_id가 있습니다. login_id를 확인하세요.', target_login_id;
  ELSE
    RAISE NOTICE '매장 생성 완료: id=%, name=%. 프로필(%) 연결됨.', new_shop_id, new_shop_name, target_login_id;
  END IF;
END $$;
