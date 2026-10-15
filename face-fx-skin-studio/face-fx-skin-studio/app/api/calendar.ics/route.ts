import { dbConfigured, getDb, initDb } from "@/lib/db";
import { safeEq } from "@/lib/admin-auth";
import { buildOwnerCalendar, type CalRow } from "@/lib/ical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live calendar feed of paid bookings for the owner to subscribe to. It contains
// customer names, emails and phone numbers, so it is protected by a secret token:
//   https://<site>/api/calendar.ics?token=<CALENDAR_FEED_TOKEN>
export async function GET(req: Request) {
  const expected = process.env.CALENDAR_FEED_TOKEN;
  const given = new URL(req.url).searchParams.get("token") ?? "";
  if (!expected || !dbConfigured() || !safeEq(given, expected)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    await initDb();
    const r = await getDb().execute(
      `SELECT id, name, email, phone, notes, service_name, event_date, event_time, duration_min
       FROM bookings WHERE status = 'paid' ORDER BY event_date, event_time`,
    );
    const rows: CalRow[] = r.rows.map((x) => ({
      id: Number(x.id),
      name: String(x.name),
      email: String(x.email),
      phone: x.phone == null ? null : String(x.phone),
      notes: x.notes == null ? null : String(x.notes),
      service_name: String(x.service_name),
      event_date: String(x.event_date),
      event_time: String(x.event_time),
      duration_min: Number(x.duration_min),
    }));
    return new Response(buildOwnerCalendar(rows), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="face-fx-bookings.ics"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("calendar feed failed", err);
    return new Response("Error", { status: 500 });
  }
}
