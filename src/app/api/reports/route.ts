import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { assertShopInStoreGroup, getAuthContext } from "@/server/auth";

type ReportRow = Record<string, unknown> & {
  id?: string;
  shop_id?: string;
  shopId?: string;
};

function normalizeShopFields<T extends ReportRow>(row: T, shopId: string) {
  const next = { ...row } as T;
  if (!next.shop_id) next.shop_id = shopId;
  if (!next.shopId) next.shopId = shopId;
  return next;
}

function getShopIdFromRow(row: ReportRow) {
  return (row.shop_id ?? row.shopId ?? null) as string | null;
}

/** 클라이언트(camelCase) → DB(snake_case) 변환. insert 시 사용 */
function reportRowToDbRow(row: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    shopId: "shop_id",
    birthDate: "birth_date",
    saleDate: "sale_date",
    productName: "product_name",
    existingCarrier: "existing_carrier",
    salesPerson: "sales_person",
    planName: "plan_name",
    supportAmount: "support_amount",
    factoryPrice: "factory_price",
    officialSubsidy: "official_subsidy",
    installmentPrincipal: "installment_principal",
    installmentMonths: "installment_months",
    faceAmount: "face_amount",
    verbalA: "verbal_a",
    verbalB: "verbal_b",
    verbalC: "verbal_c",
    verbalD: "verbal_d",
    verbalE: "verbal_e",
    verbalF: "verbal_f",
    activationTime: "activation_time",
    inspectionStore: "inspection_store",
    inspectionOffice: "inspection_office",
    lineType: "line_type",
    saleType: "sale_type",
    serialNumber: "serial_number",
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "id" || k === "uploadedAt") continue;
    const dbKey = map[k] ?? k;
    if (v !== undefined && v !== null) out[dbKey] = v;
  }
  if (row.shop_id !== undefined) out.shop_id = row.shop_id;
  if (row.shopId !== undefined && out.shop_id === undefined) out.shop_id = row.shopId;
  return out;
}

// GET /api/reports?shop_id=...
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedShopId = searchParams.get("shop_id");

    let shopIdFilter: string | null = null;

    if (auth.role === "super_admin") {
      shopIdFilter = requestedShopId ? String(requestedShopId).trim() : null;
    } else if (auth.role === "region_manager") {
      if (!auth.storeGroupId) {
        return NextResponse.json({ error: "Managed store group is not set" }, { status: 403 });
      }
      if (requestedShopId) {
        const ok = await assertShopInStoreGroup(requestedShopId, auth.storeGroupId);
        if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        shopIdFilter = requestedShopId;
      } else {
        // shop_id 없음: 담당 지점 전체 매장의 reports 반환 (지점 내 랭킹 등용)
        const { data: shopRows } = await supabaseAdmin
          .from("shops")
          .select("id")
          .eq("store_group_id", auth.storeGroupId);
        const shopIds = (shopRows ?? []).map((r: { id: string }) => r.id);
        if (shopIds.length === 0) {
          return NextResponse.json([], { status: 200 });
        }
        const { data: reportData, error: reportError } = await supabaseAdmin
          .from("reports")
          .select("*")
          .in("shop_id", shopIds);
        if (reportError) {
          console.error("Error fetching reports by store group", reportError);
          return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
        }
        const normalized = (reportData ?? []).map((r: any) => {
          const sid = (r?.shopId ?? r?.shop_id ?? null) as string | null;
          if (!sid) return r;
          return { ...r, shopId: r.shopId ?? sid, shop_id: r.shop_id ?? sid };
        });
        return NextResponse.json(normalized, { status: 200 });
      }
    } else {
      // tenant_admin / staff
      if (!auth.shopId) return NextResponse.json({ error: "Shop is not set" }, { status: 403 });
      if (requestedShopId && requestedShopId !== auth.shopId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      shopIdFilter = auth.shopId;
    }

    let query = supabaseAdmin.from("reports").select("*");
    if (shopIdFilter) query = query.eq("shop_id", shopIdFilter);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reports", error);
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }

    const normalized = (data ?? []).map((r: any) => {
      const sid = (r?.shopId ?? r?.shop_id ?? null) as string | null;
      if (!sid) return r;
      return { ...r, shopId: r.shopId ?? sid, shop_id: r.shop_id ?? sid };
    });

    return NextResponse.json(normalized, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in GET /api/reports", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/reports
// body: { reports: ReportRow[] } 또는 [ReportRow, ...]
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const reports = Array.isArray(body) ? body : body.reports;

    if (!Array.isArray(reports) || reports.length === 0) {
      return NextResponse.json(
        { error: 'reports array is required' },
        { status: 400 },
      );
    }

    // 스코프 검증 + shop_id 강제
    const requestedShopId = getShopIdFromRow(reports[0] as ReportRow);
    if (!requestedShopId) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }

    if (auth.role === "region_manager") {
      if (!auth.storeGroupId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const ok = await assertShopInStoreGroup(requestedShopId, auth.storeGroupId);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== requestedShopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const normalizedReports = (reports as ReportRow[])
      .map((r) => normalizeShopFields(r, requestedShopId))
      .map((r) => {
        const sid = getShopIdFromRow(r);
        if (sid !== requestedShopId) return null;
        return r;
      })
      .filter(Boolean);

    if (normalizedReports.length !== reports.length) {
      return NextResponse.json({ error: "All rows must have the same shop_id" }, { status: 400 });
    }

    const dbRows = normalizedReports.map((r) => reportRowToDbRow(r as Record<string, unknown>));

    const { data, error } = await supabaseAdmin
      .from('reports')
      .insert(dbRows)
      .select('*');

    if (error) {
      console.error('Error inserting reports', error);
      return NextResponse.json(
        { error: 'Failed to insert reports' },
        { status: 500 },
      );
    }

    const inserted = (data ?? []) as { shop_id: string; name?: string; phone?: string }[];
    const now = new Date().toISOString();
    for (const row of inserted) {
      const shopId = row.shop_id;
      const name = (row.name ?? "").trim() || "—";
      const phone = (row.phone ?? "").trim();
      try {
        if (phone) {
          const { data: existing } = await supabaseAdmin
            .from("crm_customers")
            .select("id")
            .eq("shop_id", shopId)
            .eq("phone", phone)
            .maybeSingle();
          if (existing?.id) {
            await supabaseAdmin
              .from("crm_customers")
              .update({ name, last_seen_at: now, updated_at: now })
              .eq("id", (existing as { id: string }).id);
          } else {
            await supabaseAdmin.from("crm_customers").insert({
              shop_id: shopId,
              name,
              phone,
              first_seen_at: now,
              last_seen_at: now,
              updated_at: now,
            });
          }
        } else {
          await supabaseAdmin.from("crm_customers").insert({
            shop_id: shopId,
            name,
            phone: null,
            first_seen_at: now,
            last_seen_at: now,
            updated_at: now,
          });
        }
      } catch (e) {
        console.warn("[POST /api/reports] crm_customers upsert skip", e);
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in POST /api/reports', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/reports
// body: { id: string }
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 },
      );
    }

    // 삭제 권한: 해당 shop 스코프 내에서만
    const { data: existing } = await supabaseAdmin
      .from("reports")
      .select("id, shop_id")
      .eq("id", id)
      .maybeSingle();

    const existingShopId = (existing as any)?.shop_id as string | null;
    if (!existingShopId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (auth.role === "region_manager") {
      if (!auth.storeGroupId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const ok = await assertShopInStoreGroup(existingShopId, auth.storeGroupId);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== existingShopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from("reports").delete().eq("id", id);

    if (error) {
      console.error('Error deleting report', error);
      return NextResponse.json(
        { error: 'Failed to delete report' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/reports', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/reports
// body: { id: string; updates: Partial<ReportRow> }
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, updates } = await req.json();

    if (!id || !updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'id and updates are required' },
        { status: 400 },
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("reports")
      .select("id, shop_id")
      .eq("id", id)
      .maybeSingle();

    const existingShopId = (existing as any)?.shop_id as string | null;
    if (!existingShopId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (auth.role === "region_manager") {
      if (!auth.storeGroupId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const ok = await assertShopInStoreGroup(existingShopId, auth.storeGroupId);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== existingShopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // shop_id 변경은 금지
    const safeUpdates = { ...(updates as Record<string, unknown>) } as Record<string, unknown>;
    delete (safeUpdates as any).shop_id;
    delete (safeUpdates as any).shopId;

    const { data, error } = await supabaseAdmin
      .from("reports")
      .update(safeUpdates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error('Error updating report', error);
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/reports', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

