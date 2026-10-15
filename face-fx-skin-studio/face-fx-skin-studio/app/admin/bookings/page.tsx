import type { Metadata } from "next";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { fmtDate, fmtTime, studioToday } from "@/lib/booking";
import { dbConfigured, getDb, initDb } from "@/lib/db";

export const metadata: Metadata = { title: "Bookings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SP = Promise<{ error?: string }>;

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

export default async function AdminBookings({ searchParams }: { searchParams: SP }) {
  const { error } = await searchParams;

  if (!adminEnabled() || !dbConfigured()) {
    return (
      <section className="section">
        <div className="wrap narrow">
          <h1>Bookings</h1>
          <p className="lead">The admin area is off until ADMIN_PASSWORD and the Turso database are configured.</p>
        </div>
      </section>
    );
  }

  if (!(await isAdmin())) {
    return (
      <section className="section">
        <div className="wrap narrow">
          <h1>Bookings</h1>
          <form method="post" action="/api/admin/login" className="admin-login">
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button type="submit" className="btn btn-primary">Sign in</button>
          </form>
          {error === "1" && <p className="book-error" role="alert">That password was not right.</p>}
          {error === "limit" && <p className="book-error" role="alert">Too many tries. Wait 15 minutes and try again.</p>}
          {error === "setup" && <p className="book-error" role="alert">Admin is not configured.</p>}
        </div>
      </section>
    );
  }

  await initDb();
  const rows = (await getDb().execute(`SELECT * FROM bookings ORDER BY event_date DESC, event_time DESC`)).rows;
  const today = studioToday();
  const upcoming = rows.filter((r) => String(r.event_date) >= today && r.status === "paid").reverse();
  const other = rows.filter((r) => !(String(r.event_date) >= today && r.status === "paid"));
  const needsAction = rows.filter((r) => r.status === "conflict");
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  const feed = process.env.CALENDAR_FEED_TOKEN ? `${base}/api/calendar.ics?token=${process.env.CALENDAR_FEED_TOKEN}` : "";

  const table = (list: typeof rows) => (
    <div className="admin-scroll">
      <table className="admin-table">
        <thead>
          <tr><th>When</th><th>Service</th><th>Client</th><th>Contact</th><th>Deposit</th><th>Status</th></tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={String(r.id)} className={r.status === "conflict" ? "is-alert" : undefined}>
              <td>{fmtDate(String(r.event_date))}<br />{fmtTime(String(r.event_time))} · {String(r.duration_min)} min</td>
              <td>{String(r.service_name)}<br /><span className="muted">{usd(Number(r.price_cents))}</span></td>
              <td>{String(r.name)}{r.notes ? <><br /><span className="muted">{String(r.notes)}</span></> : null}</td>
              <td>{String(r.email)}<br />{String(r.phone ?? "")}</td>
              <td>{usd(Number(r.deposit_cents))}</td>
              <td>{String(r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="section">
      <div className="wrap">
        <div className="admin-head">
          <h1>Bookings</h1>
          <form method="post" action="/api/admin/logout"><button type="submit" className="btn btn-outline btn-sm">Sign out</button></form>
        </div>

        {needsAction.length > 0 && (
          <p className="book-error" role="alert">
            {needsAction.length} booking{needsAction.length > 1 ? "s were" : " was"} paid for a time that was already taken and
            the automatic refund did not go through. Refund {needsAction.length > 1 ? "them" : "it"} in the Stripe dashboard.
          </p>
        )}

        <h2 className="h3">Upcoming ({upcoming.length})</h2>
        {upcoming.length ? table(upcoming) : <p className="muted">Nothing booked yet.</p>}

        {other.length > 0 && (
          <>
            <h2 className="h3 gap-top">Past, refunded and canceled ({other.length})</h2>
            {table(other)}
          </>
        )}

        <h2 className="h3 gap-top">Calendar feed</h2>
        {feed ? (
          <>
            <p className="muted">Subscribe once in Apple, Google or Outlook Calendar and every new booking appears on its own. Keep this link private.</p>
            <p><code className="admin-code">{feed}</code></p>
          </>
        ) : (
          <p className="muted">Set CALENDAR_FEED_TOKEN to turn on the subscribable calendar feed.</p>
        )}
      </div>
    </section>
  );
}
