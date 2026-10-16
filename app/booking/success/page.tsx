import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate, fmtTime } from "@/lib/booking";
import { SITE } from "@/lib/site";
import { bySlug } from "@/lib/services";
import { isDate, isTime } from "@/lib/booking";
import { isDemo } from "@/lib/demo";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = { title: "Booking received", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SP = Promise<{ session_id?: string; demo?: string; service?: string; date?: string; time?: string; email?: string }>;

// Shows details only for a real, paid session of ours. The confirmation email and
// the saved booking come from the Stripe webhook, not from this page.
async function lookup(id: string | undefined) {
  if (!id || !/^cs_[A-Za-z0-9_]+$/.test(id) || !stripeConfigured()) return null;
  try {
    const s = await getStripe().checkout.sessions.retrieve(id);
    const m = s.metadata ?? {};
    if (s.payment_status !== "paid" || m.app !== "face-fx-booking") return null;
    return { service: m.service_name, date: m.event_date, time: m.event_time, email: m.email };
  } catch {
    return null;
  }
}

export default async function SuccessPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const svc = bySlug(sp.service ?? "");
  const demoView =
    isDemo() && sp.demo === "1" && svc && isDate(sp.date ?? "") && isTime(sp.time ?? "")
      ? { service: svc.name, date: sp.date!, time: sp.time!, email: (sp.email ?? "").slice(0, 120) }
      : null;
  const b = demoView ?? (await lookup(sp.session_id));
  return (
    <section className="section">
      <div className="wrap narrow center">
        {demoView && (
          <p className="book-alert" role="status">
            Demo only: no card was charged, nothing was saved and no email was sent. Real bookings turn on once Stripe is connected.
          </p>
        )}
        <p className="eyebrow">Deposit received</p>
        <h1>You&apos;re all set</h1>
        {b ? (
          <>
            <p className="lead">
              <strong>{b.service}</strong>
              <br />
              {fmtDate(b.date)} at {fmtTime(b.time)}
            </p>
            <p className="lead">A confirmation with a calendar invite is on its way to {b.email}.</p>
          </>
        ) : (
          <p className="lead">Thank you. A confirmation email with your appointment details will arrive shortly.</p>
        )}
        <p className="muted">
          {SITE.street}, {SITE.cityLine}, inside {SITE.locatedInside}. Need to change something? Text or call{" "}
          {SITE.phoneDisplay}.
        </p>
        <p className="actions center-actions">
          <Link href="/" className="btn btn-outline">Back to home</Link>
        </p>
      </div>
    </section>
  );
}
