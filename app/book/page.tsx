import type { Metadata } from "next";
import BookingForm from "@/components/BookingForm";
import { dbConfigured } from "@/lib/db";
import { stripeConfigured } from "@/lib/stripe";
import { DEPOSIT_PERCENT, MAX_ADVANCE_DAYS, addDays, pricing, studioToday } from "@/lib/booking";
import { CATEGORIES, SERVICES } from "@/lib/services";
import { BOOKING_URL, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book an appointment",
  description: "Choose a service, pick a time and hold it with a deposit.",
  robots: { index: false, follow: false },
};

// Reads the live calendar through the API, so the page itself is always rendered fresh.
export const dynamic = "force-dynamic";

type SP = Promise<{ service?: string; canceled?: string }>;

export default async function BookPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const ready =
    dbConfigured() && stripeConfigured() && Boolean(process.env.STRIPE_WEBHOOK_SECRET && process.env.NEXT_PUBLIC_SITE_URL);

  if (!ready) {
    return (
      <section className="section">
        <div className="wrap narrow center">
          <p className="eyebrow">Online booking</p>
          <h1>Booking opens soon</h1>
          <p className="lead">
            Online booking is being set up. To book now, text or call {SITE.phoneDisplay} and the studio will find you a time.
          </p>
          <p className="actions center-actions">
            <a href={`sms:${SITE.phoneTel}`} className="btn btn-primary">Text us</a>
            <a href={`tel:${SITE.phoneTel}`} className="btn btn-outline">Call us</a>
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              Book on Square<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
      </section>
    );
  }
  const today = studioToday();
  const services = SERVICES.map((s) => ({
    slug: s.slug,
    name: s.name,
    price: s.price,
    duration: s.duration,
    category: s.category,
    deposit: pricing(s).deposit_cents / 100,
  }));
  const initial = services.some((s) => s.slug === sp.service) ? sp.service! : "";

  return (
    <>
      <section className="page-head">
        <div className="wrap narrow">
          <h1>Book an appointment</h1>
          <p className="lead">
            Choose your treatment and a time that works. A {DEPOSIT_PERCENT}% deposit holds it, and the balance is paid at the
            studio. Questions first? Text {SITE.phoneDisplay}.
          </p>
        </div>
      </section>
      <section className="section book-section">
        <div className="wrap narrow">
          <BookingForm
            services={services}
            categories={CATEGORIES.map((c) => ({ id: c.id, title: c.title }))}
            initialService={initial}
            minDate={today}
            maxDate={addDays(today, MAX_ADVANCE_DAYS)}
            canceled={sp.canceled === "1"}
            depositPercent={DEPOSIT_PERCENT}
          />
        </div>
      </section>
    </>
  );
}
