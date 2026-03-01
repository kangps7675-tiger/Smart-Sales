import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

/**
 * GET /api/store-groups
 * 지점(store_groups) 목록. super_admin 전용.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("store_groups")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching store_groups", error);
      return NextResponse.json(
        { error: "Failed to fetch store groups" },
        { status: 500 }
      );
    }

    const list = (data ?? []).map((row: { id: string; name: string }) => ({
      id: row.id,
      name: row.name ?? "",
    }));

    return NextResponse.json(list, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in GET /api/store-groups", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
