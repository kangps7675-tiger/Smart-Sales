import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

type RouteContext = { params: Promise<{ id: string; commentId: string }> };

// DELETE /api/notices/[id]/comments/[commentId] — 댓글 삭제 (본인 또는 super_admin/region_manager/tenant_admin)
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthContext(_req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: noticeId, commentId } = await context.params;
    if (!noticeId || !commentId) {
      return NextResponse.json({ error: "id and commentId are required" }, { status: 400 });
    }

    const { data: comment, error: fetchError } = await supabaseAdmin
      .from("notice_comments")
      .select("id, author_id")
      .eq("id", commentId)
      .eq("notice_id", noticeId)
      .maybeSingle();

    if (fetchError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const authorId = (comment as { author_id: string }).author_id;
    const isOwner = authorId === auth.id;
    const canDelete =
      isOwner ||
      auth.role === "super_admin" ||
      auth.role === "region_manager" ||
      auth.role === "tenant_admin";

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("notice_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      console.error("Error deleting comment", deleteError);
      return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Unexpected error in DELETE comment", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
