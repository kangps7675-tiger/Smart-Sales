import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/server/supabase';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/notices/[id] - 단건 조회
export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('notices')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching notice', error);
      return NextResponse.json(
        { error: 'Failed to fetch notice' },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in GET /api/notices/[id]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/notices/[id] - 공지 수정 (super_admin만)
// body: { title?, body?, pinned? }
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super_admin can update notices' },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const body = await req.json();
    const updates: { title?: string; body?: string; pinned?: boolean } = {};
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.body !== undefined) updates.body = String(body.body);
    if (body.pinned !== undefined) updates.pinned = Boolean(body.pinned);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'At least one of title, body, pinned is required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('notices')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating notice', error);
      return NextResponse.json(
        { error: 'Failed to update notice' },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/notices/[id]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
