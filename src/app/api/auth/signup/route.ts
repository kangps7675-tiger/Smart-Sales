import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/server/supabase';

const SALT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { login_id, password, name, role, shop_code, super_admin_signup_password } = body;

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

    let shop_id: string | null = null;

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

    const { data: inserted, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        login_id: trimmedLoginId,
        password_hash,
        name: trimmedName,
        role: roleLower,
        shop_id,
      })
      .select('id, name, role, shop_id')
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

    return NextResponse.json(
      {
        id: inserted.id,
        name: inserted.name,
        role: inserted.role,
        shop_id: inserted.shop_id,
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
