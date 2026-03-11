import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/shops/staff?shop_id=xxx
 * 해당 매장에 소속된 staff(판매사) 목록 반환.
 * 매장주·슈퍼 어드민만 조회 가능.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (auth.role !== "tenant_admin" && auth.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shopId =
      new URL(req.url).searchParams.get("shop_id") ?? auth.shopId;
    if (!shopId) {
      return NextResponse.json({ error: "shop_id required" }, { status: 400 });
    }

    if (auth.role === "tenant_admin" && auth.shopId !== shopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name")
      .eq("shop_id", shopId)
      .eq("role", "staff")
      .order("name", { ascending: true });

    if (error) {
      console.error("[shops/staff] query error", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    console.error("Unexpected error in GET /api/shops/staff", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
