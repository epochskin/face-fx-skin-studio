import type { Metadata } from "next";
import BookingForm from "@/components/BookingForm";
import { DEPOSIT_PERCENT, MAX_ADVANCE_DAYS, addDays, pricing, studioToday } from "@/lib/booking";
import { CATEGORIES, SERVICES } from "@/lib/services";
import { SITE } from "@/lib/site";

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
