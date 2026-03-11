import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/expenses/[id]
 * 본인 작성 건 삭제 (매장주/슈퍼어드민은 매장 내 모든 건 삭제 가능)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const expenseId = params.id;

    const { data: expense } = await supabaseAdmin
      .from("expenses")
      .select("id, shop_id, profile_id")
      .eq("id", expenseId)
      .maybeSingle();

    if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const expShopId = (expense as Record<string, unknown>).shop_id as string;
    const expProfileId = (expense as Record<string, unknown>).profile_id as string;

    if (auth.role === "staff") {
      if (auth.shopId !== expShopId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (auth.id !== expProfileId) {
        return NextResponse.json({ error: "본인이 등록한 건만 삭제할 수 있습니다." }, { status: 403 });
      }
    } else if (auth.role === "tenant_admin") {
      if (auth.shopId !== expShopId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from("expenses").delete().eq("id", expenseId);
    if (error) {
      console.error("[expenses DELETE]", error);
      return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[expenses DELETE] unexpected", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
