import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/server/supabase';
import { getAuthContext } from '@/server/auth';

const SALT_ROUNDS = 10;

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { current_password, new_password } = await req.json();

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'current_password and new_password are required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, password_hash')
      .eq('id', auth.id)
      .maybeSingle();

    if (error) {
      console.error('Error querying profiles by user_id', error);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!data || !data.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(current_password, data.password_hash);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ password_hash: newHash })
      .eq('id', auth.id);

    if (updateError) {
      console.error('Error updating password_hash', updateError);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in password change route', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

