import type { Metadata } from "next";
import BookingForm from "@/components/BookingForm";
import { isDemo } from "@/lib/demo";
import { DEPOSIT_PERCENT, MAX_ADVANCE_DAYS, addDays, openWindow, pricing, studioToday } from "@/lib/booking";
import Link from "next/link";
import { SERVICES, SQUARE_MENU, money } from "@/lib/services";
import { BOOKING_URL, HOURS, SITE } from "@/lib/site";

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
  const demo = isDemo();
  const ready = true; // the full flow is always clickable; demo mode just skips payment

  const today = studioToday();
  const days = Array.from({ length: 21 }, (_, i) => {
    const date = addDays(today, i);
    return { date, closed: openWindow(date) === null };
  });
  const chosen = SERVICES.find((x) => x.slug === sp.service);

  const header = (
    <section className="page-head sq-head">
      <div className="wrap narrow center">
        <h1>{SITE.name}</h1>
        <p className="lead">Corrective skincare specialist located in a health spa.</p>
        <p className="sq-contact">
          {SITE.street}, {SITE.cityLine} 70115 &nbsp;•&nbsp; <a href={`tel:${SITE.phoneTel}`}>{SITE.phoneDisplay}</a> &nbsp;•&nbsp;{" "}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
      </div>
    </section>
  );

  const hours = (
    <section className="section sq-hours">
      <div className="wrap narrow">
        <h2>Location &amp; Hours</h2>
        <table className="hours-table">
          <tbody>
            {HOURS.map((h) => (
              <tr key={h.day}>
                <th scope="row">{h.day}</th>
                <td>{h.hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="center">Address: {SITE.street}, {SITE.cityLine} 70115</p>
      </div>
    </section>
  );

  const notice = (
    <div className="sq-notice center">
      <p className="eyebrow">Preview</p>
      <p>This is a working preview. You can click through every step, but no card is charged and nothing is booked yet. To book now, text or call {SITE.phoneDisplay}.</p>
      <p className="actions center-actions">
        <a href={`sms:${SITE.phoneTel}`} className="btn btn-primary">Text us</a>
        <a href={`tel:${SITE.phoneTel}`} className="btn btn-outline">Call us</a>
        <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
          Book on Square<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </div>
  );

  if (!chosen) {
    return (
      <>
        {header}
        <section className="section book-section">
          <div className="wrap narrow">
            {sp.canceled === "1" && (
              <p className="book-alert" role="status">Checkout was canceled and you were not charged. Pick your service to start again.</p>
            )}
            {demo && notice}
            <h2>Service Menu</h2>
            <ul className="sq-menu">
              {SQUARE_MENU.map((m) => {
                const svc = SERVICES.find((x) => x.slug === m.slug)!;
                return (
                  <li key={m.slug} className="sq-item">
                    <div className="sq-info">
                      <h3>{svc.name}</h3>
                      {m.description && <p className="sq-desc">{m.description}</p>}
                      <p className="sq-dur">{svc.duration}</p>
                    </div>
                    <div className="sq-buy">
                      <p className="price">{money(svc.price)}</p>
                      {(
                        <Link href={`/book?service=${svc.slug}`} className="btn btn-primary">
                          Book<span className="sr-only"> {svc.name}</span>
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {<p className="book-hint center">A {DEPOSIT_PERCENT}% deposit holds your appointment. The balance is paid at the studio.</p>}
          </div>
        </section>
        {hours}
      </>
    );
  }

  const menuDesc = SQUARE_MENU.find((m) => m.slug === chosen.slug)?.description ?? "";
  return (
    <>
      {header}
      <section className="section book-section">
        <div className="wrap narrow">
          {demo && notice}
          <div className="sq-chosen">
            <div>
              <h2>{chosen.name}</h2>
              {menuDesc && <p className="sq-desc">{menuDesc}</p>}
              <p className="sq-dur">{chosen.duration} · {money(chosen.price)}</p>
            </div>
            <Link href="/book" className="btn btn-outline">Change service</Link>
          </div>
          <BookingForm
            service={{
              slug: chosen.slug,
              name: chosen.name,
              price: chosen.price,
              deposit: pricing(chosen).deposit_cents / 100,
            }}
            days={days}
            minDate={today}
            maxDate={addDays(today, MAX_ADVANCE_DAYS)}
            canceled={sp.canceled === "1"}
            depositPercent={DEPOSIT_PERCENT}
          />
        </div>
      </section>
      {hours}
    </>
  );
}
