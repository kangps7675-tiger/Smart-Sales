import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

// GET /api/calendar/todos?year=YYYY&month=M
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const y = parseInt(searchParams.get("year") ?? "", 10);
    const m = parseInt(searchParams.get("month") ?? "", 10);
    const year = Number.isFinite(y) ? y : new Date().getFullYear();
    const month = Number.isFinite(m) && m >= 1 && m <= 12 ? m : new Date().getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const { data, error } = await supabaseAdmin
      .from("calendar_todos")
      .select("*")
      .eq("profile_id", auth.id)
      .gte("todo_date", monthStart)
      .lte("todo_date", monthEnd)
      .order("todo_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching calendar_todos", error);
      return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
    }
    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    console.error("Unexpected error in GET /api/calendar/todos", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/calendar/todos
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const todoDate = body?.todo_date ?? body?.todoDate;
    if (!todoDate || typeof todoDate !== "string") {
      return NextResponse.json({ error: "todo_date is required" }, { status: 400 });
    }
    const dateStr = String(todoDate).slice(0, 10);
    const content = body?.content != null ? String(body.content) : "";
    const highlight = Math.min(3, Math.max(0, parseInt(body?.highlight ?? 0, 10) || 0));

    const { data, error } = await supabaseAdmin
      .from("calendar_todos")
      .insert({
        profile_id: auth.id,
        todo_date: dateStr,
        content,
        highlight,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating calendar_todo", error);
      return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/calendar/todos", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
