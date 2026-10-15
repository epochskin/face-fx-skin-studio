import { NextResponse } from "next/server";
import { computeSlots, fmtTime, isDate, openWindow, parseDuration } from "@/lib/booking";
import { bookedOn } from "@/lib/booking-db";
import { dbConfigured } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { bySlug } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// GET /api/availability?service=<slug>&date=yyyy-mm-dd -> open start times
export async function GET(req: Request) {
  if (!dbConfigured()) {
    return NextResponse.json({ error: "Online booking is not set up yet." }, { status: 503, headers: NO_STORE });
  }
  try {
    if (!(await rateLimit(`availability:${clientIp(req)}`, 60, 600))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: NO_STORE });
    }
    const url = new URL(req.url);
    const service = bySlug(url.searchParams.get("service") ?? "");
    const date = url.searchParams.get("date") ?? "";
    if (!service || !isDate(date)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: NO_STORE });
    }
    const duration = parseDuration(service.duration);
    const closed = openWindow(date) === null;
    const slots = closed ? [] : computeSlots(duration, date, await bookedOn(date));
    return NextResponse.json(
      { closed, slots: slots.map((t) => ({ time: t, label: fmtTime(t) })) },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("availability failed", err);
    return NextResponse.json({ error: "Could not load times" }, { status: 500, headers: NO_STORE });
  }
}
