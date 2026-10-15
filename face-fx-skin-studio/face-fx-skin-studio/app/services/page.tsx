import type { Metadata } from "next";
import Link from "next/link";
import BookLink from "@/components/BookLink";
import { CATEGORIES, SERVICES, inCategory, money } from "@/lib/services";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Service menu",
  description: "Facials, HydraFacials, microneedling, sugaring, waxing and spa parties with prices and times.",
};

export default function ServicesPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap narrow">
          <h1>Service menu</h1>
          <p className="lead">
            Corrective skincare by a specialist in acne, dark spots and texture. Every price and time is listed up
            front. Choose a treatment, then book it in a few taps.
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
            <ul className="menu-list">
              {inCategory(c.id).map((s) => (
                <li key={s.slug}>
                  <div className="menu-main">
                    <h3><Link href={`/services/${s.slug}`}>{s.name}</Link></h3>
                    <p>{s.summary}</p>
                  </div>
                  <div className="menu-side">
                    <p className="price">{money(s.price)}</p>
                    <p className="dur">{s.duration}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="section band-sage cta">
        <div className="wrap narrow center">
          <h2>Not sure what to book?</h2>
          <p className="lead">
            Text the studio at {SITE.phoneDisplay} and describe your skin goals. You can also add more than one service to
            the same appointment when you book.
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
