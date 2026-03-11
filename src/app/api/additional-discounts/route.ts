import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

export type AdditionalDiscountRow = {
  id: string;
  shop_id: string;
  name: string;
  amount: number;
  display_order: number;
  created_at?: string;
  updated_at?: string;
};

// GET /api/additional-discounts?shop_id=...
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const shopId = req.nextUrl.searchParams.get("shop_id")?.trim();
    if (!shopId) return NextResponse.json({ error: "shop_id is required" }, { status: 400 });

    if (auth.role === "tenant_admin" || auth.role === "staff") {
      if (auth.shopId !== shopId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("additional_discounts")
      .select("*")
      .eq("shop_id", shopId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[additional-discounts] GET", error);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    console.error("GET /api/additional-discounts", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/additional-discounts
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const shopId = body?.shop_id ?? body?.shopId;
    const name = String(body?.name ?? "").trim();
    const amount = Number(body?.amount);
    if (!shopId) return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (Number.isNaN(amount) || amount < 0) {
      return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 });
    }

    if (auth.role === "tenant_admin" || auth.role === "staff") {
      if (auth.shopId !== shopId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (auth.role !== "super_admin" && auth.role !== "tenant_admin" && auth.role !== "staff") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: maxOrder } = await supabaseAdmin
      .from("additional_discounts")
      .select("display_order")
      .eq("shop_id", shopId)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const display_order = (maxOrder as { display_order?: number } | null)?.display_order ?? -1;

    const { data, error } = await supabaseAdmin
      .from("additional_discounts")
      .insert({
        shop_id: shopId,
        name,
        amount,
        display_order: display_order + 1,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("[additional-discounts] POST", error);
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/additional-discounts", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
