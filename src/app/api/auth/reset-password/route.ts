import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/server/supabase";

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/reset-password
 * body: { token: string, new_password: string }
 * 토큰 유효 시 비밀번호 변경 후 토큰 삭제
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body?.token;
    const newPassword = body?.new_password ?? body?.newPassword;
    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "token and new_password are required" },
        { status: 400 }
      );
    }

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("token, profile_id, expires_at")
      .eq("token", String(token).trim())
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json(
        { error: "유효하지 않거나 만료된 링크입니다." },
        { status: 400 }
      );
    }

    const expiresAt = new Date((row.expires_at as string));
    if (expiresAt < new Date()) {
      await supabaseAdmin.from("password_reset_tokens").delete().eq("token", token);
      return NextResponse.json(
        { error: "재설정 링크가 만료되었습니다. 비밀번호 찾기를 다시 시도하세요." },
        { status: 400 }
      );
    }

    const profileId = row.profile_id as string;
    const newHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ password_hash: newHash })
      .eq("id", profileId);

    if (updateErr) {
      console.error("Error updating password", updateErr);
      return NextResponse.json(
        { error: "비밀번호 변경에 실패했습니다." },
        { status: 500 }
      );
    }

    await supabaseAdmin.from("password_reset_tokens").delete().eq("token", token);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in POST /api/auth/reset-password", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
