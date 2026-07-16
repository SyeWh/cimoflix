import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "cimoflix_auth";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// The cookie value is an HMAC derived from the admin password, so changing the
// password invalidates every existing session without any server-side state.
function expectedToken(password: string): string {
  return createHmac("sha256", password).update("cimoflix-admin").digest("hex");
}

export function checkPassword(input: string): boolean {
  const pw = process.env.CIMOFLIX_ADMIN_PASSWORD;
  if (!pw) return false;
  return safeEqual(input, pw);
}

export async function isAuthed(): Promise<boolean> {
  const pw = process.env.CIMOFLIX_ADMIN_PASSWORD;
  if (!pw) return false;
  const store = await cookies();
  const val = store.get(COOKIE)?.value;
  if (!val) return false;
  return safeEqual(val, expectedToken(pw));
}

export async function setAuthCookie(): Promise<void> {
  const pw = process.env.CIMOFLIX_ADMIN_PASSWORD;
  if (!pw) throw new Error("CIMOFLIX_ADMIN_PASSWORD is not set");
  const store = await cookies();
  store.set(COOKIE, expectedToken(pw), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearAuthCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
