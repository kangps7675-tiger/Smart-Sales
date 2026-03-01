import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/server/supabase';
import { getAuthContext } from '@/server/auth';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/notices/[id] - 단건 조회
export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await getAuthContext(_req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

// PATCH /api/notices/[id]
// body: { title?, body?, pinned? }
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("notices")
      .select("id, author_id, type")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching notice before update", fetchError);
      return NextResponse.json({ error: "Failed to fetch notice" }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    const noticeType = (existing as any).type as string | null;
    const authorId = (existing as any).author_id as string | null;
    const isOwner = authorId === auth.id;
    const isNotice = noticeType === "notice" || !noticeType;

    // 수정 권한:
    // - super_admin: 모든 공지/글 수정 가능
    // - region_manager / tenant_admin:
    //   - notice/post 모두 자기 글만 수정 가능
    // - staff:
    //   - post만 자기 글 수정 가능 (notice 수정 불가)
    if (auth.role === "super_admin") {
      // always allowed
    } else if (auth.role === "region_manager" || auth.role === "tenant_admin") {
      if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (auth.role === "staff") {
      if (!isOwner || isNotice) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
