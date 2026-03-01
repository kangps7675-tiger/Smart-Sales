import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/server/session";

export async function POST() {
  const res = NextResponse.json({ success: true }, { status: 200 });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

