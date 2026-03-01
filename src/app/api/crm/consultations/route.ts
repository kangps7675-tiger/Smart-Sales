import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import type { AuthContext } from "@/server/auth";
import { assertShopInStoreGroup, getAuthContext } from "@/server/auth";

function getShopScope(auth: AuthContext | null, requestedShopId: string | null) {
  if (!auth) return { allowed: false as const, shopId: null as string | null };
  if (auth.role === "super_admin") {
    return { allowed: true as const, shopId: requestedShopId ?? null };
  }
  if (auth.role === "region_manager") {
    if (!requestedShopId || !auth.storeGroupId) return { allowed: false as const, shopId: null };
    return { allowed: true as const, shopId: requestedShopId };
  }
  if (auth.role === "tenant_admin" || auth.role === "staff") {
    if (!auth.shopId) return { allowed: false as const, shopId: null };
    if (requestedShopId && requestedShopId !== auth.shopId) return { allowed: false as const, shopId: null };
    return { allowed: true as const, shopId: auth.shopId };
  }
  return { allowed: false as const, shopId: null };
}

// GET /api/crm/consultations?shop_id=...&activation_status=...
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedShopId = searchParams.get("shop_id");
    const status = searchParams.get("activation_status");

    const scope = getShopScope(auth, requestedShopId);
    if (!scope.allowed) {
      if (auth.role === "region_manager" && !requestedShopId) {
        return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if ((auth.role === "tenant_admin" || auth.role === "staff") && !scope.shopId) {
      return NextResponse.json({ error: "Shop is not set" }, { status: 403 });
    }

    let query = supabaseAdmin
      .from("crm_consultations")
      .select("*")
      .order("consultation_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (scope.shopId) query = query.eq("shop_id", scope.shopId);
    if (status === "O" || status === "△" || status === "X") {
      query = query.eq("activation_status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching crm_consultations", error);
      return NextResponse.json(
        { error: "Failed to fetch consultations" },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    console.error("Unexpected error in GET /api/crm/consultations", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/crm/consultations
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const shopId = body?.shop_id ?? body?.shopId;
    if (!shopId) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }

    if (auth.role === "region_manager") {
      if (!auth.storeGroupId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const ok = await assertShopInStoreGroup(shopId, auth.storeGroupId);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== shopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const name = String(body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const activationStatus = body?.activation_status ?? body?.activationStatus ?? "X";
    const validStatus = ["O", "△", "X"].includes(activationStatus) ? activationStatus : "X";

    const inflowTypes = ["로드", "컨택", "전화", "온라인", "지인"] as const;
    const rawInflow = body?.inflow_type ?? body?.inflowType;
    const inflow_type = rawInflow != null && inflowTypes.includes(rawInflow) ? rawInflow : null;

    const row = {
      shop_id: shopId,
      name,
      phone: body?.phone != null ? String(body.phone).trim() : null,
      product_name: body?.product_name ?? body?.productName != null ? String(body.productName).trim() : null,
      memo: body?.memo != null ? String(body.memo).trim() : null,
      consultation_date: body?.consultation_date ?? body?.consultationDate ?? new Date().toISOString().slice(0, 10),
      sales_person: body?.sales_person ?? body?.salesPerson != null ? String(body.salesPerson).trim() : null,
      activation_status: validStatus,
      inflow_type,
    };

    const { data, error } = await supabaseAdmin
      .from("crm_consultations")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("Error creating consultation", error);
      return NextResponse.json(
        { error: "Failed to create consultation" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/crm/consultations", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
