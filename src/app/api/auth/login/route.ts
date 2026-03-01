import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/server/supabase';
import { SESSION_COOKIE_NAME, signSession } from '@/server/session';

const MANAGER_LOGIN_VALID_HOURS = 24;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SESSION_SECRET) {
      console.error('SESSION_SECRET is not set');
      return NextResponse.json(
        { error: '서버 설정이 완료되지 않았습니다. SESSION_SECRET 환경 변수를 설정해 주세요.' },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const loginIdRaw = body?.login_id ?? body?.loginId ?? '';
    const login_id = typeof loginIdRaw === 'string' ? loginIdRaw.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!login_id || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 모두 입력해 주세요.' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, role, shop_id, managed_store_group_id, password_hash')
      .eq('login_id', login_id)
      .maybeSingle();

    if (error) {
      console.error('Error querying profiles by login_id', error);
      return NextResponse.json(
        { error: '로그인 처리 중 오류가 발생했습니다. 서버 로그를 확인하거나 DB 마이그레이션(managed_store_group_id 등)을 실행했는지 확인하세요.' },
        { status: 500 }
      );
    }

    if (!data) {
      console.warn('[Login] 401: 해당 로그인 아이디로 조회된 계정이 없습니다.');
      return NextResponse.json(
        { error: '등록되지 않은 아이디이거나, 아이디 또는 비밀번호를 잘못 입력하셨습니다. 가입 시 사용한 로그인 아이디(이메일 아님)를 입력했는지 확인하세요.' },
        { status: 401 },
      );
    }

    if (!data.password_hash) {
      console.warn('[Login] 401: 비밀번호가 저장되지 않은 계정입니다. profile id=', data.id);
      return NextResponse.json(
        { error: '이 계정에는 비밀번호가 설정되지 않았습니다. 비밀번호 찾기로 재설정하거나 관리자에게 문의하세요.' },
        { status: 401 },
      );
    }

    const isValid = await bcrypt.compare(password, data.password_hash);

    if (!isValid) {
      console.warn('[Login] 401: 비밀번호가 일치하지 않습니다.');
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      );
    }

    const { id, name, role, shop_id, managed_store_group_id } = data as {
      id: string;
      name: string | null;
      role: string;
      shop_id: string | null;
      managed_store_group_id: string | null;
    };

    try {
      if (role === 'staff') {
        const shopId = shop_id ?? null;
        if (!shopId) {
          return NextResponse.json(
            { error: '매장에 소속되지 않은 계정입니다. 관리자에게 문의하세요.' },
            { status: 403 },
          );
        }
        const since = new Date(Date.now() - MANAGER_LOGIN_VALID_HOURS * 60 * 60 * 1000).toISOString();

        const { data: shopRecent } = await supabaseAdmin
          .from('manager_login_timestamps')
          .select('last_login_at')
          .eq('scope_type', 'shop')
          .eq('scope_id', shopId)
          .gte('last_login_at', since)
          .limit(1);

        let hasRecentManager = Array.isArray(shopRecent) && shopRecent.length > 0;
        if (!hasRecentManager) {
          const { data: shopRow } = await supabaseAdmin
            .from('shops')
            .select('store_group_id')
            .eq('id', shopId)
            .maybeSingle();
          const storeGroupId = (shopRow as { store_group_id?: string | null } | null)?.store_group_id ?? null;
          if (storeGroupId) {
            const { data: groupRecent } = await supabaseAdmin
              .from('manager_login_timestamps')
              .select('last_login_at')
              .eq('scope_type', 'store_group')
              .eq('scope_id', storeGroupId)
              .gte('last_login_at', since)
              .limit(1);
            hasRecentManager = Array.isArray(groupRecent) && groupRecent.length > 0;
          }
        }
        if (!hasRecentManager) {
          return NextResponse.json(
            { error: '매장주 또는 지점장이 먼저 로그인한 후 판매사 로그인이 가능합니다.' },
            { status: 403 },
          );
        }
      }

      if (role === 'tenant_admin' && shop_id) {
        await supabaseAdmin
          .from('manager_login_timestamps')
          .upsert(
            { scope_type: 'shop', scope_id: shop_id, last_login_at: new Date().toISOString() },
            { onConflict: 'scope_type,scope_id' },
          );
      }
      if (role === 'region_manager' && managed_store_group_id) {
        await supabaseAdmin
          .from('manager_login_timestamps')
          .upsert(
            { scope_type: 'store_group', scope_id: managed_store_group_id, last_login_at: new Date().toISOString() },
            { onConflict: 'scope_type,scope_id' },
          );
      }
    } catch (managerTableErr) {
      console.warn('[Login] manager_login_timestamps 사용 실패(테이블 없을 수 있음). 로그인은 계속 진행.', managerTableErr);
    }

    const res = NextResponse.json(
      {
        id,
        name,
        role,
        shop_id,
        store_group_id: managed_store_group_id ?? null,
      },
      { status: 200 },
    );

    // httpOnly 세션 쿠키 발급 (서버가 이후 권한을 판정)
    let token: string;
    try {
      token = signSession(id);
    } catch (sessionErr) {
      console.error('signSession failed', sessionErr);
      return NextResponse.json(
        { error: '서버 설정이 완료되지 않았습니다. SESSION_SECRET 환경 변수를 확인해 주세요.' },
        { status: 503 },
      );
    }
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error('Unexpected error in login route', err);
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다. 터미널 또는 서버 로그를 확인해 주세요.' },
      { status: 500 },
    );
  }
}
