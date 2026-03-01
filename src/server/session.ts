import crypto from "crypto";

export const SESSION_COOKIE_NAME = "ps_session";

const DEFAULT_TTL_DAYS = 7;

type SessionPayload = {
  sub: string; // user id
  iat: number;
  exp: number;
};

function base64UrlEncode(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecodeToBuffer(input: string) {
  const pad = input.length % 4;
  const padded = input + (pad ? "=".repeat(4 - pad) : "");
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function hmacSha256(data: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(data).digest();
}

function safeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signSession(userId: string, ttlDays = DEFAULT_TTL_DAYS) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");

  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlDays * 24 * 60 * 60;
  const payload: SessionPayload = { sub: userId, iat: now, exp };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(payloadJson);
  const sig = hmacSha256(payloadB64, secret);
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

export function verifySession(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  try {
    const expectedSig = hmacSha256(payloadB64, secret);
    const actualSig = base64UrlDecodeToBuffer(sigB64);
    if (!safeEqual(expectedSig, actualSig)) return null;

    const payloadJson = base64UrlDecodeToBuffer(payloadB64).toString("utf8");
    const payload = JSON.parse(payloadJson) as SessionPayload;
    if (!payload?.sub || !payload?.exp) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

