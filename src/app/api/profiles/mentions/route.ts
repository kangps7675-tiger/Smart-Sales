import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

// GET /api/profiles/mentions?q=이름부분
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (!q) {
      return NextResponse.json([], { status: 200 });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, role")
      .ilike("name", `%${q}%`)
      .order("name", { ascending: true })
      .limit(10);

    if (error) {
      console.error("[Profiles] 멘션 후보 조회 실패", error);
      return NextResponse.json(
        { error: "Failed to fetch mention candidates" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      (data ?? []).map((row) => ({
        id: row.id,
        name: row.name ?? null,
        role: row.role ?? null,
      })),
      { status: 200 },
    );
  } catch (err) {
    console.error("Unexpected error in GET /api/profiles/mentions", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

