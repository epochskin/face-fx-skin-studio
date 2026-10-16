import type { Metadata } from "next";
import BookLink from "@/components/BookLink";
import { CATEGORIES, SQUARE_MENU, inCategory, money } from "@/lib/services";
import { IS_NATIVE, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services & booking",
  description: "Facials, HydraFacials, microneedling, sugaring, waxing and spa parties with prices and times.",
};

export default function ServicesPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap narrow">
          <h1>Services &amp; booking</h1>
          <p className="lead">
            Corrective skincare by a specialist in acne, dark spots and texture. Every price and time is listed up
            front. Choose a treatment and tap Book to pick a day and time.
          </p>
          <nav className="chips" aria-label="Jump to a category">
            {CATEGORIES.map((c) => (
              <a key={c.id} href={`#${c.id}`}>{c.title}</a>
            ))}
          </nav>
        </div>
      </section>

      {CATEGORIES.map((c) => (
        <section key={c.id} id={c.id} className="section menu-section">
          <div className="wrap narrow">
            <h2>{c.title}</h2>
            <p className="muted">{c.blurb}</p>
            <ul className="sq-menu">
              {inCategory(c.id).map((svc) => {
                const desc = SQUARE_MENU.find((m) => m.slug === svc.slug)?.description ?? "";
                return (
                  <li key={svc.slug} className="sq-item">
                    <div className="sq-info">
                      <h3>{svc.name}</h3>
                      {desc && <p className="sq-desc">{desc}</p>}
                      <p className="sq-dur">{svc.duration}</p>
                    </div>
                    <div className="sq-buy">
                      <p className="price">{money(svc.price)}</p>
                      <BookLink service={svc.slug}>
                        Book<span className="sr-only"> {svc.name}</span>
                      </BookLink>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ))}

      <section className="section band-sage cta">
        <div className="wrap narrow center">
          <h2>Not sure what to book?</h2>
          <p className="lead">
            Text the studio at {SITE.phoneDisplay} and describe your skin goals.{" "}
            {IS_NATIVE
              ? "To combine services in one visit, just ask."
              : "You can also add more than one service to the same appointment when you book."}
          </p>
          <p className="actions center-actions">
            <BookLink />
            <a href={`sms:${SITE.phoneTel}`} className="btn btn-outline">Text us</a>
          </p>
        </div>
      </section>
    </>
  );
}
