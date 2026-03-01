-- 매장주(tenant_admin) 계정의 소속 매장 연결 상태 확인
-- Supabase SQL Editor에서 실행 후 결과를 확인하세요.

-- 1) 매장주 프로필과 shop_id 확인
SELECT
  id AS profile_id,
  name,
  login_id,
  role,
  shop_id AS profile_shop_id,
  CASE
    WHEN shop_id IS NULL THEN '❌ NULL (초대코드 불가)'
    ELSE '✓ UUID 있음'
  END AS shop_id_status
FROM profiles
WHERE role = 'tenant_admin'
ORDER BY name;

-- 2) shops 테이블에 해당 shop_id가 존재하는지 확인
-- (위 결과의 profile_shop_id가 아래 shop_id에 나와야 함)
SELECT
  s.id AS shop_id,
  s.name AS shop_name,
  p.id AS owner_profile_id,
  p.name AS owner_name,
  p.login_id
FROM shops s
LEFT JOIN profiles p ON p.shop_id = s.id AND p.role = 'tenant_admin'
ORDER BY s.created_at DESC;

-- 3) 매장주인데 shop이 없거나, shop_id가 NULL인 경우만 보고 싶을 때
SELECT
  p.id,
  p.name,
  p.login_id,
  p.shop_id,
  CASE
    WHEN p.shop_id IS NULL THEN '프로필에 shop_id 없음'
    WHEN NOT EXISTS (SELECT 1 FROM shops WHERE id = p.shop_id) THEN 'shops 테이블에 해당 id 없음'
    ELSE '정상'
  END AS 문제
FROM profiles p
WHERE p.role = 'tenant_admin'
  AND (p.shop_id IS NULL OR NOT EXISTS (SELECT 1 FROM shops WHERE id = p.shop_id));
