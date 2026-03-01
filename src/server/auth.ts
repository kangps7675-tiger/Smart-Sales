import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/server/supabase";
import { SESSION_COOKIE_NAME, verifySession } from "@/server/session";

export type AuthRole = "super_admin" | "region_manager" | "tenant_admin" | "staff";

export type AuthContext = {
  id: string;
  role: AuthRole;
  shopId: string | null;
  storeGroupId: string | null; // managed_store_group_id for region_manager
  name: string | null;
};

export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySession(token);
  if (!payload) return null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, shop_id, managed_store_group_id, name")
    .eq("id", payload.sub)
    .maybeSingle();

  if (error || !data?.id || !data.role) return null;

  return {
    id: data.id as string,
    role: data.role as AuthRole,
    shopId: (data.shop_id as string | null) ?? null,
    storeGroupId: (data.managed_store_group_id as string | null) ?? null,
    name: (data.name as string | null) ?? null,
  };
}

/** 서버 컴포넌트에서 쿠키 기준으로 현재 사용자 조회 (Next.js cookies() 사용) */
export async function getAuthFromCookies(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySession(token);
  if (!payload) return null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, shop_id, managed_store_group_id, name")
    .eq("id", payload.sub)
    .maybeSingle();

  if (error || !data?.id || !data.role) return null;

  return {
    id: data.id as string,
    role: data.role as AuthRole,
    shopId: (data.shop_id as string | null) ?? null,
    storeGroupId: (data.managed_store_group_id as string | null) ?? null,
    name: (data.name as string | null) ?? null,
  };
}

export async function assertShopInStoreGroup(shopId: string, storeGroupId: string) {
  const { data } = await supabaseAdmin
    .from("shops")
    .select("store_group_id")
    .eq("id", shopId)
    .maybeSingle();
  return (data?.store_group_id ?? null) === storeGroupId;
}

