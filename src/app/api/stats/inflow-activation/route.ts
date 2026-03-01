import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { assertShopInStoreGroup, getAuthContext } from "@/server/auth";

const CATEGORIES = ["로드", "컨택", "전화", "온라인", "지인"] as const;

/** reports.path(유입경로) 텍스트를 통계 5개 카테고리로 매핑 */
function pathToCategory(path: string | null | undefined): (typeof CATEGORIES)[number] {
  const p = (path ?? "").trim();
  if (/지인/.test(p)) return "지인";
  if (/당근|온라인/.test(p)) return "온라인";
  if (/전화/.test(p)) return "전화";
  if (/컨택|워킹/.test(p)) return "컨택";
  return "로드";
}

type StatsRow = {
  label: string;
  days: number[];
  total: number;
  percent: number;
};

type StatsTable = {
  rows: StatsRow[];
  totalRow: { days: number[]; total: number };
};

function buildEmptyTotalRow(daysInMonth: number): { days: number[]; total: number } {
  return {
    days: Array.from({ length: daysInMonth }, () => 0),
    total: 0,
  };
}

function buildStatsTable(
  dayCounts: Map<string, Map<number, number>>,
  daysInMonth: number,
): StatsTable {
  const totalRow = buildEmptyTotalRow(daysInMonth);
  const rows: StatsRow[] = CATEGORIES.map((label) => {
    const byDay = dayCounts.get(label) ?? new Map<number, number>();
    const days = Array.from({ length: daysInMonth }, (_, i) => byDay.get(i + 1) ?? 0);
    const total = days.reduce((a, b) => a + b, 0);
    days.forEach((v, i) => {
      totalRow.days[i] = (totalRow.days[i] ?? 0) + v;
    });
    totalRow.total += total;
    return { label, days, total, percent: 0 };
  });
  rows.forEach((r) => {
    r.percent = totalRow.total > 0 ? Math.round((r.total / totalRow.total) * 1000) / 10 : 0;
  });
  return { rows, totalRow };
}

// GET /api/stats/inflow-activation?shop_id=...&month=YYYY-MM
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedShopId = searchParams.get("shop_id");
    const monthParam = searchParams.get("month") ?? "";
    const [y, m] = monthParam
      ? monthParam.split("-").map(Number)
      : [new Date().getFullYear(), new Date().getMonth() + 1];
    const year = Number.isFinite(y) ? y : new Date().getFullYear();
    const month = Number.isFinite(m) && m >= 1 && m <= 12 ? m : new Date().getMonth() + 1;
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    let shopId: string | null = null;
    if (auth.role === "super_admin") {
      shopId = requestedShopId?.trim() ?? null;
    } else if (auth.role === "region_manager") {
      if (!requestedShopId || !auth.storeGroupId)
        return NextResponse.json({ error: "shop_id required" }, { status: 400 });
      const ok = await assertShopInStoreGroup(requestedShopId, auth.storeGroupId);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      shopId = requestedShopId;
    } else if (auth.role === "tenant_admin" || auth.role === "staff") {
      if (!auth.shopId) return NextResponse.json({ error: "Shop is not set" }, { status: 403 });
      if (requestedShopId && requestedShopId !== auth.shopId)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      shopId = auth.shopId;
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!shopId) {
      return NextResponse.json({ error: "shop_id required" }, { status: 400 });
    }

    const [consultationsRes, reportsRes] = await Promise.all([
      supabaseAdmin
        .from("crm_consultations")
        .select("consultation_date, inflow_type")
        .eq("shop_id", shopId)
        .gte("consultation_date", monthStart)
        .lte("consultation_date", monthEnd),
      supabaseAdmin
        .from("reports")
        .select("sale_date, path")
        .eq("shop_id", shopId)
        .gte("sale_date", monthStart)
        .lte("sale_date", monthEnd),
    ]);

    const inflowDayCounts = new Map<string, Map<number, number>>();
    CATEGORIES.forEach((c) => inflowDayCounts.set(c, new Map<number, number>()));

    for (const row of consultationsRes.data ?? []) {
      const dateStr = (row as { consultation_date?: string }).consultation_date;
      const inflow = (row as { inflow_type?: string | null }).inflow_type;
      const category = inflow && CATEGORIES.includes(inflow as (typeof CATEGORIES)[number])
        ? (inflow as (typeof CATEGORIES)[number])
        : "로드";
      if (!dateStr) continue;
      const day = parseInt(dateStr.slice(8, 10), 10);
      if (day >= 1 && day <= daysInMonth) {
        const byDay = inflowDayCounts.get(category)!;
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
      }
    }

    const activationDayCounts = new Map<string, Map<number, number>>();
    CATEGORIES.forEach((c) => activationDayCounts.set(c, new Map<number, number>()));

    for (const row of reportsRes.data ?? []) {
      const dateStr = (row as { sale_date?: string }).sale_date;
      const path = (row as { path?: string | null }).path;
      const category = pathToCategory(path);
      if (!dateStr) continue;
      const day = parseInt(String(dateStr).slice(8, 10), 10);
      if (day >= 1 && day <= daysInMonth) {
        const byDay = activationDayCounts.get(category)!;
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
      }
    }

    const inflow = buildStatsTable(inflowDayCounts, daysInMonth);
    const activation = buildStatsTable(activationDayCounts, daysInMonth);

    return NextResponse.json(
      {
        month: `${year}-${String(month).padStart(2, "0")}`,
        daysInMonth,
        inflow,
        activation,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Unexpected error in GET /api/stats/inflow-activation", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
