import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/calendar/todos/[id]
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("calendar_todos")
      .select("id, profile_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing || (existing.profile_id as string) !== auth.id) {
      return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body?.content !== undefined) updates.content = String(body.content);
    if (body?.highlight !== undefined) {
      const h = Math.min(3, Math.max(0, parseInt(body.highlight, 10) || 0));
      updates.highlight = h;
    }

    const { data, error } = await supabaseAdmin
      .from("calendar_todos")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating calendar_todo", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/calendar/todos/[id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/calendar/todos/[id]
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("calendar_todos")
      .select("id, profile_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing || (existing.profile_id as string) !== auth.id) {
      return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    }

    const { error } = await supabaseAdmin.from("calendar_todos").delete().eq("id", id);
    if (error) {
      console.error("Error deleting calendar_todo", error);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/calendar/todos/[id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
