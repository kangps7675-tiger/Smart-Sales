import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/server/supabase';

// GET /api/notices
// 전체 공지 조회, pinned 먼저 정렬 후 최신순
export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('notices')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notices', error);
      return NextResponse.json(
        { error: 'Failed to fetch notices' },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    console.error('Unexpected error in GET /api/notices', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/notices
// body: { title, body, author_id, pinned }
// super_admin만 작성 가능: 헤더 x-user-role: super_admin
export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super_admin can create notices' },
        { status: 403 },
      );
    }

    const { title, body, author_id, pinned } = await req.json();

    if (!title || !body || !author_id) {
      return NextResponse.json(
        { error: 'title, body, author_id are required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('notices')
      .insert({
        title: String(title).trim(),
        body: String(body),
        author_id,
        pinned: Boolean(pinned),
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting notice', error);
      return NextResponse.json(
        { error: 'Failed to create notice' },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in POST /api/notices', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/notices
// body: { id }
export async function DELETE(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super_admin can delete notices' },
        { status: 403 },
      );
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from('notices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting notice', error);
      return NextResponse.json(
        { error: 'Failed to delete notice' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/notices', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

