import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

const SNAKE_TO_CAMEL: Record<string, string> = {
  shop_id: "shopId",
  birth_date: "birthDate",
  sale_date: "saleDate",
  product_name: "productName",
  existing_carrier: "existingCarrier",
  sales_person: "salesPerson",
  plan_name: "planName",
  support_amount: "supportAmount",
  factory_price: "factoryPrice",
  official_subsidy: "officialSubsidy",
  installment_principal: "installmentPrincipal",
  installment_months: "installmentMonths",
  face_amount: "faceAmount",
  verbal_a: "verbalA",
  verbal_b: "verbalB",
  verbal_c: "verbalC",
  verbal_d: "verbalD",
  verbal_e: "verbalE",
  verbal_f: "verbalF",
  activation_time: "activationTime",
  inspection_store: "inspectionStore",
  inspection_office: "inspectionOffice",
  line_type: "lineType",
  sale_type: "saleType",
  serial_number: "serialNumber",
  additional_discount_ids: "additionalDiscountIds",
  additional_discount_amount: "additionalDiscountAmount",
  uploaded_at: "uploadedAt",
};

function dbRowToClientRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[SNAKE_TO_CAMEL[k] ?? k] = v;
  }
  const sid = (out.shopId ?? out.shop_id ?? null) as string | null;
  out.shopId = sid;
  out.shop_id = sid;
  out.additionalDiscountAmount = Number(out.additionalDiscountAmount ?? out.additional_discount_amount ?? 0) || 0;
  if (!out.additionalDiscountIds) {
    out.additionalDiscountIds = Array.isArray(row.additional_discount_ids) ? row.additional_discount_ids : [];
  }
  return out;
}

/**
 * GET /api/reports/snapshots/[id]
 * 스냅샷의 전체 데이터(엔트리 포함) 반환
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const snapshotId = params.id;

    const { data: snap } = await supabaseAdmin
      .from("report_snapshots")
      .select("id, shop_id, name, entry_count, created_by, created_at")
      .eq("id", snapshotId)
      .maybeSingle();

    if (!snap) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const snapShopId = (snap as Record<string, unknown>).shop_id as string;

    if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== snapShopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: entries, error: entryErr } = await supabaseAdmin
      .from("report_snapshot_entries")
      .select("data")
      .eq("snapshot_id", snapshotId);

    if (entryErr) {
      console.error("[snapshots/[id] GET] entries error", entryErr);
      return NextResponse.json({ error: "스냅샷 데이터 조회에 실패했습니다." }, { status: 500 });
    }

    const reportRows = (entries ?? []).map((e: { data: Record<string, unknown> }) =>
      dbRowToClientRow(e.data),
    );

    return NextResponse.json({ snapshot: snap, entries: reportRows }, { status: 200 });
  } catch (err) {
    console.error("[snapshots/[id] GET] unexpected", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
