import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/server/supabase';

export async function POST(req: NextRequest) {
  try {
    const { login_id, password } = await req.json();

    if (!login_id || !password) {
      return NextResponse.json(
        { error: 'login_id and password are required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, role, shop_id, password_hash')
      .eq('login_id', login_id)
      .maybeSingle();

    if (error) {
      console.error('Error querying profiles by login_id', error);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!data || !data.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, data.password_hash);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { id, name, role, shop_id } = data as {
      id: string;
      name: string | null;
      role: string;
      shop_id: string | null;
    };

    return NextResponse.json(
      {
        id,
        name,
        role,
        shop_id,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error in login route', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
