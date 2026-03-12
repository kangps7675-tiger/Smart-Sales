import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

async function getDiscountAndCheckAuth(req: NextRequest, id: string) {
  const auth = await getAuthContext(req);
  if (!auth) return { auth: null as null, discount: null as null };
  const { data: discount, error } = await supabaseAdmin
    .from("additional_discounts")
    .select("id, shop_id")
    .eq("id", id)
    .maybeSingle();
  if (error || !discount) return { auth, discount: null };
  const shopId = (discount as { shop_id: string }).shop_id;
  if (auth.role === "tenant_admin" || auth.role === "staff") {
    if (auth.shopId !== shopId) return { auth, discount: null };
  }
  return { auth, discount };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { auth, discount } = await getDiscountAndCheckAuth(req, id);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!discount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (auth.role !== "super_admin" && auth.role !== "tenant_admin" && auth.role !== "staff") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!Number.isNaN(amount) && amount >= 0) updates.amount = amount;
    }
    if (body.display_order !== undefined) updates.display_order = Number(body.display_order);

    const { data, error } = await supabaseAdmin
      .from("additional_discounts")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/additional-discounts/[id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { auth, discount } = await getDiscountAndCheckAuth(req, id);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!discount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (auth.role !== "super_admin" && auth.role !== "tenant_admin" && auth.role !== "staff") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from("additional_discounts").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/additional-discounts/[id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
