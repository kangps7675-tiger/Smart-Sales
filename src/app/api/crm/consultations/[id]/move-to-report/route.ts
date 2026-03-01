import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { assertShopInStoreGroup, getAuthContext } from "@/server/auth";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/crm/consultations/[id]/move-to-report
 * 개통여부 O인 상담을 판매일보(reports)로 한 건 생성하고, 해당 상담에 report_id 연결
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { data: consultation, error: fetchErr } = await supabaseAdmin
      .from("crm_consultations")
      .select("id, shop_id, name, phone, product_name, memo, consultation_date, sales_person, activation_status, report_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    const c = consultation as {
      shop_id: string;
      report_id: string | null;
      activation_status: string;
      name: string;
      phone: string | null;
      product_name: string | null;
      consultation_date: string;
      sales_person: string | null;
    };

    if (c.report_id) {
      return NextResponse.json(
        { error: "Already moved to report" },
        { status: 400 },
      );
    }

    if (c.activation_status !== "O") {
      return NextResponse.json(
        { error: "Only consultations with status O can be moved to report" },
        { status: 400 },
      );
    }

    if (auth.role === "region_manager") {
      if (!auth.storeGroupId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const ok = await assertShopInStoreGroup(c.shop_id, auth.storeGroupId);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== c.shop_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reportRow = {
      shop_id: c.shop_id,
      name: c.name,
      phone: c.phone ?? "",
      birth_date: "",
      address: "",
      path: "",
      existing_carrier: "",
      sale_date: c.consultation_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      product_name: c.product_name ?? "",
      amount: 0,
      margin: 0,
      sales_person: c.sales_person ?? null,
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("reports")
      .insert(reportRow)
      .select("id")
      .single();

    if (insertErr) {
      console.error("Error inserting report from consultation", insertErr);
      return NextResponse.json(
        { error: "Failed to create report row" },
        { status: 500 },
      );
    }

    const reportId = (inserted as { id: string }).id;
    await supabaseAdmin
      .from("crm_consultations")
      .update({ report_id: reportId, updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json(
      { report_id: reportId, message: "Moved to report" },
      { status: 200 },
    );
  } catch (err) {
    console.error("Unexpected error in move-to-report", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
