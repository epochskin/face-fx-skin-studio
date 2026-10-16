import Image from "next/image";
import Link from "next/link";
import BookLink from "@/components/BookLink";
import HoursTable from "@/components/HoursTable";
import ServiceCard from "@/components/ServiceCard";
import { bySlug, money } from "@/lib/services";
import { DEPOSIT_PERCENT } from "@/lib/booking";
import { DIRECTIONS_URL, IS_NATIVE, MAP_EMBED_URL, SITE } from "@/lib/site";

const FEATURED = ["fall-reset-facial", "hydrafacial-classic", "hydrafacial-platinum", "brazilian-sugar"]
  .map((s) => bySlug(s)!)
  .filter(Boolean);

export default function Home() {
  const party = bySlug("spa-party")!;
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{SITE.tagline}</p>
            <h1>
              Corrective skincare that feels like <em>self-care</em>
            </h1>
            <p className="lead">
              HydraFacials, microneedling and organic sugaring, tailored to your skin by a seven-year corrective
              skincare specialist, in a calm, private studio inside {SITE.locatedInside}.
            </p>
            <p className="actions">
              <BookLink />
              <Link href="/services" className="btn btn-outline">View services</Link>
            </p>
          </div>

          <div className="hero-art">
            <div className="frame">
              <Image quality={90}
                src="/images/artist-portrait.jpg"
                alt="Your skin specialist seated on a mat in a pink Skin Girls tee"
                width={1120}
                height={1500}
                sizes="(max-width: 900px) 80vw, 420px"
                priority
              />
            </div>
            <Image className="seal" src="/images/logo.png" alt="" width={120} height={120} />
          </div>
        </div>
      </section>

      {/* WHAT SHE'S KNOWN FOR */}
      <section className="strip" aria-label="Highlights">
        <div className="wrap strip-grid">
          <p><strong>Acne, dark spots and texture</strong>Her specialties, treated with a corrective approach.</p>
          <p><strong>The Reset Lounge</strong>Arrive early for a complimentary mimosa and a healthy snack.</p>
          <p><strong>Open Thursday through Monday</strong>Evenings until 8 pm, Sundays 10 to 2.</p>
        </div>
      </section>

      {/* SERVICES PREVIEW */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>Treatments, priced plainly</h2>
            <p className="lead">A few favorites. Every price and time is listed up front.</p>
          </div>
          <div className="grid grid-4">
            {FEATURED.map((s) => (
              <ServiceCard key={s.slug} s={s} />
            ))}
          </div>
          <p className="center-actions">
            <Link href="/services" className="btn btn-outline">See the full menu</Link>
          </p>
        </div>
      </section>

      {/* RESET LOUNGE */}
      <section className="section band-sage">
        <div className="wrap split">
          <div className="split-photo">
            <div className="frame frame-light">
              <Image quality={90}
                src="/images/lounge.jpg"
                alt="The Reset Lounge with soft ottomans, a white rug and a blush throw blanket"
                width={1600}
                height={868}
                sizes="(max-width: 900px) 92vw, 540px"
              />
            </div>
          </div>
          <div>
            <h2>
              Arrive early. <em>Unwind first.</em>
            </h2>
            <p className="lead">
              The Reset Lounge is a quiet corner to settle in before your treatment. Come a little early and enjoy a
              complimentary mimosa and a healthy snack, so you walk into your facial already relaxed.
            </p>
            <p><Link href="/about" className="btn btn-outline">See the studio</Link></p>
          </div>
        </div>
      </section>

      {/* MEET THE ARTIST */}
      <section className="section">
        <div className="wrap split split-reverse">
          <div className="split-photo">
            <div className="frame">
              <Image quality={90}
                src="/images/room.jpg"
                alt="The private treatment room with a treatment bed, mirror and skincare device"
                width={1488}
                height={1088}
                sizes="(max-width: 900px) 92vw, 460px"
              />
            </div>
          </div>
          <div>
            <h2>Personal care in a private room</h2>
            <p className="lead">
              Your specialist has seven years in corrective skincare and focuses on acne, dark spots and texture. Her
              approach is results-driven and personal, because skin is personal and your care should be too.
            </p>
            <blockquote>
              Because you deserve the glow of refinement without compromise.
              <cite>From the studio&apos;s love letter to its clients</cite>
            </blockquote>
            <p><Link href="/about" className="btn btn-outline">Meet your specialist</Link></p>
          </div>
        </div>
      </section>

      {/* SPA PARTIES */}
      <section className="section band-cream-deep">
        <div className="wrap narrow center">
          <h2>Spa parties for the people you love</h2>
          <p className="lead">
            Bridal showers, birthdays and girls&apos; days for groups of 3–5 or more. Includes a HydraFacial Express,
            V-Steam and ionic foot detox, with champagne, organic fresh juice, a private aromatherapy relaxation room and a
            light charcuterie.
          </p>
          <p className="party-price">
            {money(party.price)} <span>for {party.duration}</span>
          </p>
          <p className="actions center-actions">
            <BookLink />
            <Link href={`/services/${party.slug}`} className="btn btn-outline">Party details</Link>
          </p>
        </div>
      </section>

      {/* HOW BOOKING WORKS */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>Booking takes a few taps</h2>
          </div>
          <ol className="steps">
            <li>
              <h3>{IS_NATIVE ? "Choose your service" : "Choose your services"}</h3>
              <p>{IS_NATIVE ? "Pick the treatment you would like." : "Pick one treatment or add more to the same appointment."}</p>
            </li>
            <li>
              <h3>Pick a time</h3>
              <p>See live availability and choose what fits your day. Times are shown in Central Time.</p>
            </li>
            <li>
              <h3>{IS_NATIVE ? "Pay your deposit" : "Confirm in Square"}</h3>
              <p>
                {IS_NATIVE
                  ? `Checkout is secure. A ${DEPOSIT_PERCENT}% deposit holds your time and the balance is paid at the studio.`
                  : "Checkout happens securely in Square. A card on file is required, and some services take a deposit."}
              </p>
            </li>
          </ol>
          <p className="center-actions"><BookLink /></p>
        </div>
      </section>

      {/* VISIT */}
      <section className="section band-cream-deep">
        <div className="wrap visit-grid">
          <div>
            <h2>Find the studio</h2>
            <p className="lead">
              {SITE.street}, {SITE.cityLine}<br />
              Inside {SITE.locatedInside}
            </p>
            <HoursTable />
            <p className="actions">
              <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline">Get directions</a>
            </p>
          </div>
          <div className="map">
            <iframe
              title="Map showing Face FX Skin Studio on Louisiana Avenue in New Orleans"
              src={MAP_EMBED_URL}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section band-sage cta">
        <div className="wrap narrow center">
          <h2>Ready for your reset?</h2>
          <p className="lead">Choose your treatment and grab a time that works for you.</p>
          <p className="center-actions"><BookLink /></p>
        </div>
      </section>
    </>
  );
}
