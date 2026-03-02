import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { assertShopInStoreGroup, getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

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
          report_import_config: null,
        },
        { status: 200 },
      );
    }

    const row = data as { shop_id: string; margin_rate_pct?: number; sales_target_monthly?: number; per_sale_incentive?: number; report_import_config?: unknown; updated_at?: string };
    return NextResponse.json({
      shop_id: row.shop_id,
      margin_rate_pct: Number(row.margin_rate_pct) ?? 0,
      sales_target_monthly: Number(row.sales_target_monthly) ?? 0,
      per_sale_incentive: Number(row.per_sale_incentive) ?? 30000,
      report_import_config: row.report_import_config ?? null,
      updated_at: row.updated_at,
    }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in GET /api/shop-settings', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/** report_import_config 검증: null 또는 { columnMapping?, marginFormula?, marginSumFields? } */
function normalizeReportImportConfig(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (obj.columnMapping != null && typeof obj.columnMapping === "object" && !Array.isArray(obj.columnMapping)) {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj.columnMapping as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) m[String(k).trim()] = v.trim();
    }
    out.columnMapping = m;
  }
  if (obj.marginFormula === "use_column" || obj.marginFormula === "sum_fields") {
    out.marginFormula = obj.marginFormula;
  }
  if (Array.isArray(obj.marginSumFields)) {
    out.marginSumFields = (obj.marginSumFields as unknown[]).filter((x) => typeof x === "string");
  }
  return Object.keys(out).length ? out : null;
}

/**
 * PATCH /api/shop-settings
 * body: { shop_id, margin_rate_pct?, sales_target_monthly?, per_sale_incentive?, report_import_config? }
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
      .select('margin_rate_pct, sales_target_monthly, per_sale_incentive, report_import_config')
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
    const report_import_config = body.report_import_config !== undefined
      ? normalizeReportImportConfig(body.report_import_config)
      : (existing as { report_import_config?: unknown } | null)?.report_import_config ?? null;

    const payload: { shop_id: string; margin_rate_pct: number; sales_target_monthly: number; per_sale_incentive: number; updated_at: string; report_import_config?: Record<string, unknown> | null } = {
      shop_id: shopId,
      margin_rate_pct,
      sales_target_monthly,
      per_sale_incentive,
      updated_at: new Date().toISOString(),
    };
    if (report_import_config !== undefined) payload.report_import_config = report_import_config;

    const { data, error } = await supabaseAdmin
      .from('shop_settings')
      .upsert(payload, { onConflict: 'shop_id' })
      .select('*')
      .single();

    if (error) {
      console.error('Error upserting shop_settings', error);
      return NextResponse.json(
        { error: 'Failed to save shop settings' },
        { status: 500 },
      );
    }

    const row = data as { shop_id: string; margin_rate_pct?: number; sales_target_monthly?: number; per_sale_incentive?: number; report_import_config?: unknown; updated_at?: string };
    return NextResponse.json({
      shop_id: row.shop_id,
      margin_rate_pct: Number(row.margin_rate_pct) ?? 0,
      sales_target_monthly: Number(row.sales_target_monthly) ?? 0,
      per_sale_incentive: Number(row.per_sale_incentive) ?? 30000,
      report_import_config: row.report_import_config ?? null,
      updated_at: row.updated_at,
    }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/shop-settings', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
