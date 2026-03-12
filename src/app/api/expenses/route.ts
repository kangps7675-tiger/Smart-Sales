import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/expenses?shop_id=...&month=2026-03
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedShopId = searchParams.get("shop_id");
    const month = searchParams.get("month");

    let shopIdFilter: string | null = null;

    if (auth.role === "super_admin") {
      shopIdFilter = requestedShopId ?? null;
    } else {
      if (!auth.shopId) return NextResponse.json({ error: "Shop is not set" }, { status: 403 });
      if (requestedShopId && requestedShopId !== auth.shopId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      shopIdFilter = auth.shopId;
    }

    let query = supabaseAdmin
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (shopIdFilter) query = query.eq("shop_id", shopIdFilter);

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      const start = `${month}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${month}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("expense_date", start).lte("expense_date", end);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[expenses GET]", error);
      return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    console.error("[expenses GET] unexpected", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/expenses
 * body: { shop_id, expense_date, description, amount, memo? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const shopId = String(body.shop_id ?? body.shopId ?? "").trim();
    if (!shopId) return NextResponse.json({ error: "shop_id is required" }, { status: 400 });

    if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== shopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const description = String(body.description ?? "").trim();
    const amount = Number(body.amount ?? 0);
    if (!description) return NextResponse.json({ error: "적요를 입력해 주세요." }, { status: 400 });
    if (amount <= 0) return NextResponse.json({ error: "금액을 입력해 주세요." }, { status: 400 });

    let buyerName = auth.name ?? "";
    if (!buyerName && auth.id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("name")
        .eq("id", auth.id)
        .maybeSingle();
      buyerName = (profile as { name?: string } | null)?.name ?? "";
    }

    const row = {
      shop_id: shopId,
      profile_id: auth.id ?? "00000000-0000-0000-0000-000000000000",
      buyer_name: buyerName,
      expense_date: body.expense_date ?? body.expenseDate ?? new Date().toISOString().slice(0, 10),
      description,
      amount,
      memo: body.memo != null ? String(body.memo).trim() : null,
    };

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("[expenses POST]", error);
      return NextResponse.json({ error: "등록에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[expenses POST] unexpected", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
