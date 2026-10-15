import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, adminEnabled, adminToken, safeEq } from "@/lib/admin-auth";
import { dbConfigured } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST (form) the password once; on success an httpOnly cookie is set.
export async function POST(req: Request) {
  const back = (qs = "") => NextResponse.redirect(new URL(`/admin/bookings${qs}`, req.url), 303);
  if (!adminEnabled() || !dbConfigured()) return back("?error=setup");

  try {
    if (!(await rateLimit(`admin-login:${clientIp(req)}`, 5, 900))) return back("?error=limit");
    const form = await req.formData();
    const password = String(form.get("password") ?? "");
    if (!safeEq(password, process.env.ADMIN_PASSWORD!)) return back("?error=1");

    const res = back();
    res.cookies.set(ADMIN_COOKIE, adminToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_COOKIE_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("admin login failed", err);
    return back("?error=1");
  }
}
