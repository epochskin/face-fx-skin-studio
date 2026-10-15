import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate, fmtTime } from "@/lib/booking";
import { SITE } from "@/lib/site";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = { title: "Booking received", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SP = Promise<{ session_id?: string }>;

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
  const b = await lookup((await searchParams).session_id);
  return (
    <section className="section">
      <div className="wrap narrow center">
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
