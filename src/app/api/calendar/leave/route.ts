import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

/** GET /api/calendar/leave?year=YYYY&month=M */
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
      .from("calendar_leave")
      .select("leave_date, label")
      .eq("profile_id", auth.id)
      .gte("leave_date", monthStart)
      .lte("leave_date", monthEnd);

    if (error) {
      console.error("Error fetching calendar_leave", error);
      return NextResponse.json({ error: "Failed to fetch leave" }, { status: 500 });
    }
    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    console.error("Unexpected error in GET /api/calendar/leave", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/calendar/leave  body: { leave_date: "YYYY-MM-DD", label?: string } */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const leaveDate = body?.leave_date ?? body?.leaveDate;
    if (!leaveDate || typeof leaveDate !== "string") {
      return NextResponse.json({ error: "leave_date is required" }, { status: 400 });
    }
    const dateStr = String(leaveDate).slice(0, 10);
    const label = body?.label != null ? String(body.label) : "휴가";

    const { data, error } = await supabaseAdmin
      .from("calendar_leave")
      .upsert(
        { profile_id: auth.id, leave_date: dateStr, label },
        { onConflict: "profile_id,leave_date" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("Error upserting calendar_leave", error);
      return NextResponse.json({ error: "Failed to set leave" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/calendar/leave", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/calendar/leave?date=YYYY-MM-DD */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateStr = (searchParams.get("date") ?? "").slice(0, 10);
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: "date (YYYY-MM-DD) is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("calendar_leave")
      .delete()
      .eq("profile_id", auth.id)
      .eq("leave_date", dateStr);

    if (error) {
      console.error("Error deleting calendar_leave", error);
      return NextResponse.json({ error: "Failed to remove leave" }, { status: 500 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/calendar/leave", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
