import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/server/supabase';

const SALT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      login_id,
      password,
      name,
      role,
      shop_code,
      shop_name,
      super_admin_signup_password,
      managed_store_group_id,
      region_manager_signup_password,
      store_group_name,
    } = body;

    if (!login_id || !password || !name || !role) {
      return NextResponse.json(
        { error: 'login_id, password, name, role are required' },
        { status: 400 },
      );
    }

    const trimmedLoginId = String(login_id).trim();
    const trimmedName = String(name).trim();
    const roleLower = String(role).trim().toLowerCase();

    if (roleLower === 'super_admin') {
      const envPassword = process.env.SUPER_ADMIN_SIGNUP_PASSWORD;
      if (!envPassword) {
        console.error('SUPER_ADMIN_SIGNUP_PASSWORD is not set');
        return NextResponse.json(
          { error: 'Super admin signup is not configured' },
          { status: 503 },
        );
      }
      const secret = super_admin_signup_password ?? '';
      if (secret !== envPassword) {
        return NextResponse.json(
          { error: 'Invalid super admin signup password' },
          { status: 403 },
        );
      }
    }

    if (roleLower === 'region_manager') {
      const envPassword = process.env.REGION_MANAGER_SIGNUP_PASSWORD;
      if (!envPassword) {
        console.error('REGION_MANAGER_SIGNUP_PASSWORD is not set');
        return NextResponse.json(
          { error: 'Region manager signup is not configured' },
          { status: 503 },
        );
      }
      const secret = region_manager_signup_password ?? '';
      if (secret !== envPassword) {
        return NextResponse.json(
          { error: 'Invalid region manager signup password' },
          { status: 403 },
        );
      }
    }

    let shop_id: string | null = null;
    let stored_managed_store_group_id: string | null = null;

    if (roleLower === 'tenant_admin') {
      const shopName = shop_name != null ? String(shop_name).trim() : '';
      if (!shopName) {
        return NextResponse.json(
          { error: 'shop_name is required for tenant_admin signup' },
          { status: 400 },
        );
      }
      const { data: newShop, error: shopError } = await supabaseAdmin
        .from('shops')
        .insert({ name: shopName })
        .select('id')
        .single();
      if (shopError) {
        console.error('Error creating shop', shopError);
        return NextResponse.json(
          { error: 'Failed to create shop' },
          { status: 500 },
        );
      }
      shop_id = newShop?.id ?? null;
    }

    if (roleLower === 'region_manager') {
      if (managed_store_group_id && String(managed_store_group_id).trim() !== '') {
        stored_managed_store_group_id = String(managed_store_group_id).trim();
      } else {
        const groupName = store_group_name != null ? String(store_group_name).trim() : '';
        if (!groupName) {
          return NextResponse.json(
            { error: 'store_group_name is required for region_manager signup' },
            { status: 400 },
          );
        }
        const { data: newGroup, error: groupError } = await supabaseAdmin
          .from('store_groups')
          .insert({ name: groupName })
          .select('id')
          .single();
        if (groupError) {
          console.error('Error creating store_group', groupError);
          return NextResponse.json(
            { error: 'Failed to create store group' },
            { status: 500 },
          );
        }
        stored_managed_store_group_id = (newGroup as { id?: string | null } | null)?.id ?? null;
      }
    }

    if (roleLower === 'staff') {
      if (!shop_code || String(shop_code).trim() === '') {
        return NextResponse.json(
          { error: 'shop_code is required for staff signup' },
          { status: 400 },
        );
      }
      const code = String(shop_code).trim();
      const { data: invite, error: inviteError } = await supabaseAdmin
        .from('invites')
        .select('shop_id')
        .eq('code', code)
        .maybeSingle();

      if (inviteError) {
        console.error('Error querying invites', inviteError);
        return NextResponse.json(
          { error: 'Failed to validate invite code' },
          { status: 500 },
        );
      }
      if (!invite?.shop_id) {
        return NextResponse.json(
          { error: 'Invalid or expired invite code' },
          { status: 400 },
        );
      }
      shop_id = invite.shop_id;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const insertPayload: Record<string, unknown> = {
      login_id: trimmedLoginId,
      password_hash,
      name: trimmedName,
      role: roleLower,
      shop_id,
    };
    if (stored_managed_store_group_id) {
      insertPayload.managed_store_group_id = stored_managed_store_group_id;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('profiles')
      .insert(insertPayload)
      .select('id, name, role, shop_id, managed_store_group_id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'login_id already exists' },
          { status: 409 },
        );
      }
      console.error('Error inserting profile', error);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 },
      );
    }

    const profile = inserted as { id: string; name: string | null; role: string; shop_id: string | null; managed_store_group_id?: string | null };
    return NextResponse.json(
      {
        id: profile.id,
        name: profile.name,
        role: profile.role,
        shop_id: profile.shop_id,
        store_group_id: profile.managed_store_group_id ?? null,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('Unexpected error in signup route', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
