import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { assertShopInStoreGroup, getAuthContext } from "@/server/auth";

type RouteContext = { params: Promise<{ id: string }> };

async function getConsultationAndScope(id: string, auth: Awaited<ReturnType<typeof getAuthContext>>) {
  const { data, error } = await supabaseAdmin
    .from("crm_consultations")
    .select("id, shop_id, activation_status, report_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return { consultation: null, allowed: false };
  const shopId = (data as { shop_id: string }).shop_id;

  if (auth?.role === "super_admin") return { consultation: data, allowed: true };
  if (auth?.role === "region_manager") {
    if (!auth.storeGroupId) return { consultation: data, allowed: false };
    const ok = await assertShopInStoreGroup(shopId, auth.storeGroupId);
    return { consultation: data, allowed: ok };
  }
  if (auth?.role === "tenant_admin" || auth?.role === "staff") {
    return { consultation: data, allowed: auth.shopId === shopId };
  }
  return { consultation: data, allowed: false };
}

// PATCH /api/crm/consultations/[id]
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { consultation, allowed } = await getConsultationAndScope(id, auth);
    if (!consultation || !allowed) {
      return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body?.name !== undefined) updates.name = String(body.name).trim();
    if (body?.phone !== undefined) updates.phone = body.phone == null ? null : String(body.phone).trim();
    if (body?.product_name !== undefined) updates.product_name = body.product_name == null ? null : String(body.product_name).trim();
    if (body?.productName !== undefined) updates.product_name = body.productName == null ? null : String(body.productName).trim();
    if (body?.memo !== undefined) updates.memo = body.memo == null ? null : String(body.memo).trim();
    if (body?.consultation_date !== undefined) updates.consultation_date = String(body.consultation_date).slice(0, 10);
    if (body?.consultationDate !== undefined) updates.consultation_date = String(body.consultationDate).slice(0, 10);
    if (body?.sales_person !== undefined) updates.sales_person = body.sales_person == null ? null : String(body.sales_person).trim();
    if (body?.salesPerson !== undefined) updates.sales_person = body.salesPerson == null ? null : String(body.salesPerson).trim();
    if (body?.activation_status !== undefined || body?.activationStatus !== undefined) {
      const v = body?.activation_status ?? body?.activationStatus;
      updates.activation_status = ["O", "△", "X"].includes(v) ? v : "X";
    }
    const inflowTypes = ["로드", "컨택", "전화", "온라인", "지인"] as const;
    if (body?.inflow_type !== undefined || body?.inflowType !== undefined) {
      const v = body?.inflow_type ?? body?.inflowType;
      updates.inflow_type = v != null && inflowTypes.includes(v) ? v : null;
    }

    const { data, error } = await supabaseAdmin
      .from("crm_consultations")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating consultation", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in PATCH consultation", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/crm/consultations/[id]
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthContext(_req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { consultation, allowed } = await getConsultationAndScope(id, auth);
    if (!consultation || !allowed) {
      return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    }

    const { error } = await supabaseAdmin.from("crm_consultations").delete().eq("id", id);
    if (error) {
      console.error("Error deleting consultation", error);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Unexpected error in DELETE consultation", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
