import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

async function checkTableExists(): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("report_snapshots")
    .select("id")
    .limit(0);
  return !error;
}

let tableExists: boolean | null = null;

const TABLE_CREATE_SQL = `
-- Supabase SQL Editor에서 실행하세요:
CREATE TABLE IF NOT EXISTS report_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  entry_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_snapshot_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id uuid NOT NULL REFERENCES report_snapshots(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_shop ON report_snapshots(shop_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshot_entries_snap ON report_snapshot_entries(snapshot_id);
`;

/**
 * GET /api/reports/snapshots?shop_id=...
 * 저장 목록 조회 (snapshot_data는 제외, 메타 정보만)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (tableExists === null) tableExists = await checkTableExists();
    if (!tableExists) {
      console.warn("[snapshots GET] table not found. Run the following SQL:\n", TABLE_CREATE_SQL);
      return NextResponse.json([], { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const requestedShopId = searchParams.get("shop_id");

    let shopIdFilter: string | null = null;
    if (auth.role === "super_admin") {
      shopIdFilter = requestedShopId ?? null;
    } else {
      if (!auth.shopId) return NextResponse.json({ error: "Shop is not set" }, { status: 403 });
      shopIdFilter = auth.shopId;
    }

    let query = supabaseAdmin
      .from("report_snapshots")
      .select("id, shop_id, name, entry_count, created_by, created_at")
      .order("created_at", { ascending: false });

    if (shopIdFilter) query = query.eq("shop_id", shopIdFilter);

    const { data, error } = await query;
    if (error) {
      console.error("[snapshots GET] query error", error);
      return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    console.error("[snapshots GET] unexpected", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/reports/snapshots
 * body: { shop_id, name? }
 * 현재 reports 테이블에서 해당 매장 데이터를 스냅샷으로 저장
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (tableExists === null) tableExists = await checkTableExists();
    if (!tableExists) {
      console.warn("[snapshots POST] table not found. Run the following SQL:\n", TABLE_CREATE_SQL);
      return NextResponse.json(
        { error: "저장 기능을 사용하려면 Supabase에 report_snapshots 테이블을 먼저 생성해야 합니다. 서버 로그를 확인하세요." },
        { status: 500 },
      );
    }

    const body = await req.json();
    const shopId = String(body.shop_id ?? "").trim();
    const snapshotName = String(body.name ?? "").trim() || `${new Date().toLocaleDateString("ko-KR")} 저장`;

    if (!shopId) return NextResponse.json({ error: "shop_id is required" }, { status: 400 });

    if (auth.role === "tenant_admin" && auth.shopId !== shopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: reports, error: fetchErr } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("shop_id", shopId);

    if (fetchErr) {
      console.error("[snapshots POST] fetch reports error", fetchErr);
      return NextResponse.json({ error: "판매일보 조회에 실패했습니다." }, { status: 500 });
    }

    const rows = reports ?? [];
    if (rows.length === 0) {
      return NextResponse.json({ error: "저장할 판매일보 데이터가 없습니다." }, { status: 400 });
    }

    const { data: snap, error: insertErr } = await supabaseAdmin
      .from("report_snapshots")
      .insert({
        shop_id: shopId,
        name: snapshotName,
        entry_count: rows.length,
        created_by: auth.id ?? null,
      })
      .select("id, shop_id, name, entry_count, created_by, created_at")
      .single();

    if (insertErr || !snap) {
      console.error("[snapshots POST] insert snapshot error", insertErr);
      return NextResponse.json({ error: "스냅샷 저장에 실패했습니다." }, { status: 500 });
    }

    const snapshotId = (snap as Record<string, unknown>).id as string;

    const BATCH = 200;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).map((r: Record<string, unknown>) => ({
        snapshot_id: snapshotId,
        data: r,
      }));
      const { error: entryErr } = await supabaseAdmin
        .from("report_snapshot_entries")
        .insert(batch);
      if (entryErr) {
        console.error("[snapshots POST] insert entries error", entryErr);
        await supabaseAdmin.from("report_snapshots").delete().eq("id", snapshotId);
        return NextResponse.json({ error: "스냅샷 항목 저장에 실패했습니다." }, { status: 500 });
      }
    }

    return NextResponse.json(snap, { status: 201 });
  } catch (err) {
    console.error("[snapshots POST] unexpected", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/reports/snapshots
 * body: { id }
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { data: snap } = await supabaseAdmin
      .from("report_snapshots")
      .select("id, shop_id")
      .eq("id", id)
      .maybeSingle();

    if (!snap) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const snapShopId = (snap as Record<string, unknown>).shop_id as string;
    if (auth.role === "tenant_admin" && auth.shopId !== snapShopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from("report_snapshots").delete().eq("id", id);
    if (error) {
      console.error("[snapshots DELETE] error", error);
      return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[snapshots DELETE] unexpected", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
