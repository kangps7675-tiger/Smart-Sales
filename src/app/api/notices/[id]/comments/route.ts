import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/notices/[id]/comments — 댓글·대댓글 목록 (notice_id 기준, 작성일순)
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthContext(_req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: noticeId } = await context.params;
    if (!noticeId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data: rawData, error } = await supabaseAdmin
      .from("notice_comments")
      .select("id, notice_id, author_id, parent_id, body, created_at")
      .eq("notice_id", noticeId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching notice comments", error);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 },
      );
    }

    const rows = (rawData ?? []) as Array<{
      id: string;
      author_id: string;
      parent_id: string | null;
      body: string;
      created_at: string;
    }>;
    const authorIds: string[] = [];
    for (const r of rows) {
      if (!authorIds.includes(r.author_id)) {
        authorIds.push(r.author_id);
      }
    }
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("id, name")
      .in("id", authorIds);
    const nameById = new Map(
      (profileData ?? []).map((p: { id: string; name: string | null }) => [p.id, p.name ?? null]),
    );

    const comments = rows.map((r) => ({
      id: r.id,
      notice_id: noticeId,
      author_id: r.author_id,
      parent_id: r.parent_id,
      body: r.body,
      created_at: r.created_at,
      author_name: nameById.get(r.author_id) ?? null,
    }));

    return NextResponse.json(comments, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in GET /api/notices/[id]/comments", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/notices/[id]/comments — 댓글/대댓글 작성 (body, parent_id?)
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: noticeId } = await context.params;
    if (!noticeId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await req.json();
    const { body: commentBody, parent_id: parentId } = body;
    const trimmedBody = typeof commentBody === "string" ? commentBody.trim() : "";
    if (!trimmedBody) {
      return NextResponse.json(
        { error: "body is required" },
        { status: 400 },
      );
    }

    const { data: notice } = await supabaseAdmin
      .from("notices")
      .select("id")
      .eq("id", noticeId)
      .maybeSingle();

    if (!notice) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    const insert: {
      notice_id: string;
      author_id: string;
      parent_id?: string | null;
      body: string;
    } = {
      notice_id: noticeId,
      author_id: auth.id,
      body: trimmedBody,
    };
    if (parentId != null && parentId !== "") {
      insert.parent_id = String(parentId);
    }

    const { data, error } = await supabaseAdmin
      .from("notice_comments")
      .insert(insert)
      .select("id, notice_id, author_id, parent_id, body, created_at")
      .single();

    if (error) {
      console.error("Error creating comment", error);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ...data,
        author_name: auth.name ?? null,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Unexpected error in POST /api/notices/[id]/comments", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
