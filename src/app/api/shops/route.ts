import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/shops
 * 현재 사용자가 접근 가능한 매장 목록을 DB(shops)에서 반환.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let query = supabaseAdmin
      .from('shops')
      .select('id, name, created_at')
      .order('created_at', { ascending: false });

    if (auth.role === 'super_admin') {
      // 전체 매장
    } else if ((auth.role === 'tenant_admin' || auth.role === 'staff') && auth.shopId) {
      query = query.eq('id', auth.shopId);
    } else {
      // 역할/헤더 부족 시 빈 배열
      return NextResponse.json([], { status: 200 });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching shops', error);
      return NextResponse.json(
        { error: 'Failed to fetch shops' },
        { status: 500 },
      );
    }

    type Row = { id: string; name: string; created_at: string; subscription_status?: string };
    const shops = (data ?? []).map((row: Row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      subscriptionStatus: row.subscription_status ?? 'active',
    }));

    return NextResponse.json(shops, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in GET /api/shops', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
