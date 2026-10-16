import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "What Face FX Skin Studio collects when you book online, why, and who handles it.",
};

// A plain-language disclosure of how booking data is handled. Not legal advice:
// have the studio review it, and a lawyer review anything unusual, before launch.
export default function PrivacyPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap narrow">
          <h1>Privacy notice</h1>
          <p className="lead">How we handle the details you share when you book with {SITE.name}.</p>
        </div>
      </section>
      <section className="section">
        <div className="wrap narrow prose">
          <h2 className="h3">What we collect</h2>
          <p>
            When you book online: your name, email address, mobile phone number, the service and time you choose, and any
            note you add. Card details are entered on Stripe&apos;s secure checkout page and never reach this website or our
            database.
          </p>

          <h2 className="h3 gap-top">Why we collect it</h2>
          <p>
            To hold your appointment, take your deposit, send your confirmation and calendar invite, and contact you about
            your visit. We do not sell your information.
          </p>

          <h2 className="h3 gap-top">Who handles it</h2>
          <ul className="checks">
            <li><strong>Stripe</strong> processes your deposit payment.</li>
            <li><strong>Resend</strong> sends your confirmation email.</li>
            <li><strong>Turso</strong> stores the booking record in a database used only for this studio.</li>
            <li>The studio&apos;s own staff see your booking so they can prepare for your visit.</li>
          </ul>

          <h2 className="h3 gap-top">How long we keep it</h2>
          <p>We keep booking records until you ask us to delete them, or as long as needed for payment and tax records.</p>

          <h2 className="h3 gap-top">Your requests</h2>
          <p>
            To see, correct or delete your information, email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or text{" "}
            {SITE.phoneDisplay}.
          </p>
        </div>
      </section>
    </>
  );
}
