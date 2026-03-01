import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { assertShopInStoreGroup, getAuthContext } from "@/server/auth";

/**
 * GET /api/shop-settings?shop_id=...
 * 헤더: x-user-role, x-user-shop-id, x-store-group-id (지점장일 때)
 */
export async function GET(req: NextRequest) {
  try {
    const shopId = req.nextUrl.searchParams.get('shop_id');
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!shopId) {
      return NextResponse.json(
        { error: "shop_id is required" },
        { status: 400 },
      );
    }

    if (auth.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (auth.role === "tenant_admin" && auth.shopId !== shopId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (auth.role === "region_manager") {
      if (!auth.storeGroupId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const ok = await assertShopInStoreGroup(shopId, auth.storeGroupId);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('shop_settings')
      .select('*')
      .eq('shop_id', shopId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching shop_settings', error);
      return NextResponse.json(
        { error: 'Failed to fetch shop settings' },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          shop_id: shopId,
          margin_rate_pct: 0,
          sales_target_monthly: 0,
          per_sale_incentive: 30000,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      shop_id: data.shop_id,
      margin_rate_pct: Number(data.margin_rate_pct) ?? 0,
      sales_target_monthly: Number(data.sales_target_monthly) ?? 0,
      per_sale_incentive: Number(data.per_sale_incentive) ?? 30000,
      updated_at: data.updated_at,
    }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in GET /api/shop-settings', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/shop-settings
 * body: { shop_id, margin_rate_pct?, sales_target_monthly?, per_sale_incentive? }
 * 헤더: x-user-role, x-user-shop-id, x-store-group-id (지점장일 때)
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const shopId = body.shop_id;
    if (!shopId) {
      return NextResponse.json(
        { error: 'shop_id is required' },
        { status: 400 },
      );
    }

    if (auth.role === "tenant_admin" && auth.shopId !== shopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (auth.role === "region_manager") {
      if (!auth.storeGroupId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const ok = await assertShopInStoreGroup(shopId, auth.storeGroupId);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existing } = await supabaseAdmin
      .from('shop_settings')
      .select('margin_rate_pct, sales_target_monthly, per_sale_incentive')
      .eq('shop_id', shopId)
      .maybeSingle();

    const margin_rate_pct =
      typeof body.margin_rate_pct === 'number' && body.margin_rate_pct >= 0 && body.margin_rate_pct <= 100
        ? body.margin_rate_pct
        : Number(existing?.margin_rate_pct) ?? 0;
    const sales_target_monthly =
      typeof body.sales_target_monthly === 'number' && body.sales_target_monthly >= 0
        ? body.sales_target_monthly
        : Number(existing?.sales_target_monthly) ?? 0;
    const per_sale_incentive =
      typeof body.per_sale_incentive === 'number' && body.per_sale_incentive >= 0
        ? body.per_sale_incentive
        : Number(existing?.per_sale_incentive) ?? 30000;

    const { data, error } = await supabaseAdmin
      .from('shop_settings')
      .upsert(
        {
          shop_id: shopId,
          margin_rate_pct,
          sales_target_monthly,
          per_sale_incentive,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'shop_id' },
      )
      .select('*')
      .single();

    if (error) {
      console.error('Error upserting shop_settings', error);
      return NextResponse.json(
        { error: 'Failed to save shop settings' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      shop_id: data.shop_id,
      margin_rate_pct: Number(data.margin_rate_pct) ?? 0,
      sales_target_monthly: Number(data.sales_target_monthly) ?? 0,
      per_sale_incentive: Number(data.per_sale_incentive) ?? 30000,
      updated_at: data.updated_at,
    }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/shop-settings', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
