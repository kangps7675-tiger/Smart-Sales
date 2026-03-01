import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

// GET /api/notices
// 전체 공지 조회, pinned 먼저 정렬 후 최신순
export async function GET(_req: NextRequest) {
  try {
    // 공지 조회도 로그인 세션 기준 (데이터 노출 최소화)
    const auth = await getAuthContext(_req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
// body: { title, body, pinned, type? }
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, body, pinned, type } = await req.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 },
      );
    }

    const requestedType = String(type ?? "notice").trim() || "notice";
    if (requestedType !== "notice" && requestedType !== "post") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // 권한 규칙:
    // - super_admin: notice / post 모두 작성 가능
    // - region_manager / tenant_admin: notice / post 모두 작성 가능
    // - staff: post만 작성 가능 (공지 작성 불가)
    if (requestedType === "notice") {
      if (auth.role !== "super_admin" && auth.role !== "region_manager" && auth.role !== "tenant_admin") {
        return NextResponse.json({ error: "Only super_admin, region_manager, or tenant_admin can create notices" }, { status: 403 });
      }
    } else if (requestedType === "post") {
      if (auth.role !== "super_admin" && auth.role !== "region_manager" && auth.role !== "tenant_admin" && auth.role !== "staff") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('notices')
      .insert({
        title: String(title).trim(),
        body: String(body),
        author_id: auth.id,
        pinned: Boolean(pinned),
        type: requestedType,
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
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 },
      );
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("notices")
      .select("id, author_id, type")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching notice before delete", fetchError);
      return NextResponse.json({ error: "Failed to fetch notice" }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    const noticeType = (existing as any).type as string | null;
    const authorId = (existing as any).author_id as string | null;

    const isOwner = authorId === auth.id;
    const isNotice = noticeType === "notice" || !noticeType;

    // 삭제 권한:
    // - super_admin: 모든 공지/글 삭제 가능
    // - region_manager / tenant_admin:
    //   - notice/post 모두 자기 글만 삭제 가능
    // - staff:
    //   - post만 자기 글 삭제 가능 (notice 삭제 불가)
    if (auth.role === "super_admin") {
      // always allowed
    } else if (auth.role === "region_manager" || auth.role === "tenant_admin") {
      if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (auth.role === "staff") {
      if (!isOwner || isNotice) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

