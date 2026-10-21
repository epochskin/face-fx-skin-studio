import type { Metadata } from "next";
import BookLink from "@/components/BookLink";
import Photo from "@/components/Photo";
import { DEPOSIT_PERCENT } from "@/lib/booking";
import { IS_NATIVE, IS_SQUARE_API, SITE, TAKES_DEPOSIT } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "Meet your corrective skincare specialist and see the studio, the Reset Lounge and what to know before your visit.",
};

const PREP = [
  "Stop using retinol 72 hours before your service.",
  "Take a few minutes for yourself. Relax and enjoy a sensory experience before your treatment.",
  "Let her know if you're pregnant or nursing.",
  "Share any skin or lifestyle concerns so your care can be tailored to you.",
];

const FAQ = [
  {
    q: "How does booking work?",
    a: IS_SQUARE_API
      ? `Choose your service, pick a day and time and enter your details. Your appointment goes straight onto the studio's calendar. Need to change something? Text or call ${SITE.phoneDisplay}.`
      : TAKES_DEPOSIT
      ? `Choose your service, pick a day and time, then pay a ${DEPOSIT_PERCENT}% deposit by card to hold it. The balance is paid at the studio. You'll get a confirmation email with a calendar invite.`
      : "Choose your services, pick a time and confirm in Square. A card on file is required to book, and some services take a deposit. You'll see the details before you confirm.",
  },
  {
    q: "Can I book more than one service?",
    a: IS_NATIVE
      ? `Each online booking is one service. To combine services in one visit, text or call ${SITE.phoneDisplay} and the studio will set it up.`
      : "Yes. When you book, Square lets you add more services to the same appointment and shows your total and time.",
  },
  {
    q: "Where is the studio?",
    a: `${SITE.street}, ${SITE.cityLine}, inside ${SITE.locatedInside}.`,
  },
  {
    q: "What if I have a question before I book?",
    a: `Text or call ${SITE.phoneDisplay}, or email ${SITE.email}.`,
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap narrow">
          <p className="eyebrow">About</p>
          <h1>Skin is personal. <em>Your care should be too.</em></h1>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div className="split-photo">
            <div className="frame">
              <Photo slot="specialist" sizes="(max-width: 900px) 70vw, 360px" />
            </div>
          </div>
          <div>
            <h2>Meet your skin specialist</h2>
            <p className="lead">
              A seven-year corrective skincare expert who specializes in acne, dark spots and texture. Her work is
              results-driven and skin-proud, built to help you feel confident through healthy skin.
            </p>
            <p>
              Treatments use professional-only product lines, advanced skincare technology and luxurious ingredients,
              with luxury that stays affordable.
            </p>
            <blockquote>
              Because you deserve the glow of refinement without compromise.
              <cite>From the studio&apos;s love letter to its clients</cite>
            </blockquote>
            <p className="actions"><BookLink /></p>
          </div>
        </div>
      </section>

      <section className="section band-sage">
        <div className="wrap">
          <div className="section-head">
            <h2>Inside the studio</h2>
            <p className="lead">A private treatment room and a quiet lounge inside {SITE.locatedInside}.</p>
          </div>
          <div className="gallery">
            <figure>
              <Photo slot="room" sizes="(max-width: 900px) 92vw, 380px" />
              <figcaption>The treatment room</figcaption>
            </figure>
            <figure>
              <Photo slot="lounge" sizes="(max-width: 900px) 92vw, 380px" />
              <figcaption>The Reset Lounge</figcaption>
            </figure>
            <figure>
              <Photo slot="entrance" sizes="(max-width: 900px) 92vw, 380px" />
              <figcaption>The spa entrance</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap narrow">
          <h2>Before your visit</h2>
          <p className="muted">A little prep helps you get the most from your treatment.</p>
          <ul className="checks">
            {PREP.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section band-cream-deep">
        <div className="wrap narrow">
          <h2>Good to know</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p className="actions"><BookLink /></p>
        </div>
      </section>
    </>
  );
}
