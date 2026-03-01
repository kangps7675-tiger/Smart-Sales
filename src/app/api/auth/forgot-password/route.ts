import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase";
import crypto from "crypto";

const TOKEN_BYTES = 32;
const EXPIRES_HOURS = 1;

/**
 * POST /api/auth/forgot-password
 * body: { login_id: string }
 * 응답: { reset_link: string } 또는 에러
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const loginId = body?.login_id ?? body?.loginId;
    if (!loginId || typeof loginId !== "string") {
      return NextResponse.json({ error: "login_id is required" }, { status: 400 });
    }

    const trimmed = String(loginId).trim();
    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("login_id", trimmed)
      .maybeSingle();

    if (fetchErr || !profile?.id) {
      return NextResponse.json(
        { error: "해당 아이디로 등록된 계정이 없습니다." },
        { status: 404 }
      );
    }

    const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
    const expiresAt = new Date(Date.now() + EXPIRES_HOURS * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabaseAdmin
      .from("password_reset_tokens")
      .insert({ token, profile_id: profile.id, expires_at: expiresAt });

    if (insertErr) {
      console.error("Error inserting password_reset_token", insertErr);
      return NextResponse.json(
        { error: "재설정 링크 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? "";
    const origin = baseUrl.startsWith("http")
      ? baseUrl.replace(/\/$/, "")
      : baseUrl
        ? `https://${baseUrl.replace(/^https?:\/\//, "")}`.replace(/\/$/, "")
        : "";
    const resetLink = origin
      ? `${origin}/login?tab=reset_password&token=${token}`
      : `/login?tab=reset_password&token=${token}`;

    return NextResponse.json({ reset_link: resetLink, expires_in_hours: EXPIRES_HOURS }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in POST /api/auth/forgot-password", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
