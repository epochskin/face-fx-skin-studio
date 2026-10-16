import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "ffx_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export const adminEnabled = () => Boolean(process.env.ADMIN_PASSWORD);

export function safeEq(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

// The cookie holds an HMAC keyed by the password, never the password itself.
// Changing ADMIN_PASSWORD signs everyone out.
export function adminToken(): string {
  return createHmac("sha256", process.env.ADMIN_PASSWORD!).update("face-fx-admin-v1").digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  if (!adminEnabled()) return false;
  const v = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(v) && safeEq(v!, adminToken());
}
