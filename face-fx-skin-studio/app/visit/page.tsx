import type { Metadata } from "next";
import BookLink from "@/components/BookLink";
import HoursTable from "@/components/HoursTable";
import { DIRECTIONS_URL, MAP_EMBED_URL, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Visit",
  description: "Location, hours and contact details for Face FX Skin Studio on Louisiana Ave in New Orleans.",
};

export default function VisitPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap narrow">
          <h1>Visit the studio</h1>
          <p className="lead">
            Find us at {SITE.street}, {SITE.cityLine}, inside {SITE.locatedInside}.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap visit-grid">
          <div>
            <h2 className="h3">Location</h2>
            <p>
              {SITE.street}<br />
              {SITE.cityLine}<br />
              Inside {SITE.locatedInside}
            </p>
            <p className="actions">
              <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline">Get directions</a>
            </p>

            <h2 className="h3 gap-top">Hours</h2>
            <HoursTable />

            <h2 className="h3 gap-top">Contact</h2>
            <ul className="contact-list">
              <li><a href={`tel:${SITE.phoneTel}`}>Call {SITE.phoneDisplay}</a></li>
              <li><a href={`sms:${SITE.phoneTel}`}>Text {SITE.phoneDisplay}</a></li>
              <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li><a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram {SITE.instagramHandle}</a></li>
            </ul>
          </div>

          <div className="map map-tall">
            <iframe
              title="Map showing Face FX Skin Studio on Louisiana Avenue in New Orleans"
              src={MAP_EMBED_URL}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <section className="section band-sage cta">
        <div className="wrap narrow center">
          <h2>Come see us</h2>
          <p className="lead">Book your appointment, then arrive a little early to enjoy the Reset Lounge.</p>
          <p className="center-actions"><BookLink /></p>
        </div>
      </section>
    </>
  );
}
