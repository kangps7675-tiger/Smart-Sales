-- RLS 정책 예시 (향후 Supabase Auth 연동 시 사용)
-- 현재는 Next API Route에서 service role 키로만 접근하므로, 실제 RLS는 비활성 상태일 수 있습니다.
-- 추후 Supabase Auth(anon 키) + client 직접 쿼리로 전환할 때 이 스크립트를 기반으로 조정하세요.

-- 전제:
-- - auth.users.id = profiles.id (Supabase Auth와 profiles가 1:1 매핑된 구조)
-- - profiles.role IN ('super_admin', 'region_manager', 'tenant_admin', 'staff')
-- - profiles.shop_id, profiles.managed_store_group_id 컬럼이 존재

-- 참고: 실제 프로덕션에서 적용 전, 반드시 스테이징에서 충분히 테스트하세요.

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;

-- 헬퍼 함수: 현재 요청자의 role/shop/group 가져오기
create or replace view v_current_profile as
select
  p.*
from profiles p
where p.id = auth.uid();

-- PROFILES: 자기 자신의 프로필만 조회/수정 (super_admin은 전체)
create policy profiles_select_self
on profiles
for select
using (
  id = auth.uid()
  or exists (
    select 1 from v_current_profile cp where cp.role = 'super_admin'
  )
);

create policy profiles_update_self
on profiles
for update
using (
  id = auth.uid()
  or exists (
    select 1 from v_current_profile cp where cp.role = 'super_admin'
  )
);

-- REPORTS: 매장 스코프 기반
create policy reports_select_by_scope
on reports
for select
using (
  exists (
    select 1 from v_current_profile cp
    where
      (
        cp.role = 'super_admin'
        or (cp.role in ('tenant_admin', 'staff') and cp.shop_id = reports.shop_id)
        or (
          cp.role = 'region_manager'
          and exists (
            select 1 from shops s
            where s.id = reports.shop_id
              and s.store_group_id = cp.managed_store_group_id
          )
        )
      )
  )
);

create policy reports_insert_by_scope
on reports
for insert
with check (
  exists (
    select 1 from v_current_profile cp
    where
      (
        cp.role = 'super_admin'
        or (cp.role in ('tenant_admin', 'staff') and cp.shop_id = reports.shop_id)
        or (
          cp.role = 'region_manager'
          and exists (
            select 1 from shops s
            where s.id = reports.shop_id
              and s.store_group_id = cp.managed_store_group_id
          )
        )
      )
  )
);

-- 기타 테이블(salary_snapshots, shop_settings 등)은 reports와 유사하게
-- shop_id 및 store_group_id 스코프를 기준으로 정책을 작성하면 됩니다.

