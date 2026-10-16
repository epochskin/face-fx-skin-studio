import { Resend } from "resend";
import { fmtDate, fmtTime } from "./booking";
import { buildClientEvent, buildOwnerEvent, type CalRow } from "./ical";
import { SITE } from "./site";

export type BookingRecord = CalRow & {
  email: string;
  price_cents: number;
  deposit_cents: number;
};

// Lazy init, same rule as the other clients.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (_resend) return _resend;
  _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

const from = () => process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const owner = () => process.env.RESEND_TO_EMAIL || SITE.email;

// Customer-supplied text goes into HTML emails, so it is always escaped.
export const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const when = (b: CalRow) => `${fmtDate(b.event_date)} at ${fmtTime(b.event_time)}`;
const ics = (content: string) => [{ filename: "appointment.ics", content: Buffer.from(content).toString("base64") }];

function assertSent(res: { error: unknown }) {
  if (res.error) throw new Error(`Resend: ${JSON.stringify(res.error)}`);
}

/** Confirmation to the client and a notification to the owner, both with an .ics invite. */
export async function sendBookingEmails(b: BookingRecord): Promise<void> {
  const resend = getResend();
  const balance = b.price_cents - b.deposit_cents;
  const errors: unknown[] = [];

  try {
    assertSent(
      await resend.emails.send({
        from: from(),
        to: b.email,
        replyTo: owner(),
        subject: `You're booked: ${b.service_name}, ${fmtDate(b.event_date)}`,
        attachments: ics(buildClientEvent(b)),
        html: `<h2>You're booked.</h2>
<p><strong>${esc(b.service_name)}</strong><br>${esc(when(b))}</p>
<p>${esc(SITE.street)}, ${esc(SITE.cityLine)}<br>Inside ${esc(SITE.locatedInside)}</p>
<p>Deposit paid: ${usd(b.deposit_cents)}${balance > 0 ? `<br>Balance due at the studio: ${usd(balance)}` : ""}</p>
<p>Add it to your calendar with the attached file. Need to change something? Text or call ${esc(SITE.phoneDisplay)}.</p>`,
      }),
    );
  } catch (e) {
    errors.push(e);
  }

  try {
    assertSent(
      await resend.emails.send({
        from: from(),
        to: owner(),
        replyTo: b.email,
        subject: `New booking: ${b.name}, ${fmtDate(b.event_date)} ${fmtTime(b.event_time)}`,
        attachments: ics(buildOwnerEvent(b)),
        html: `<h2>New booking</h2>
<p><strong>${esc(b.service_name)}</strong><br>${esc(when(b))} (${b.duration_min} min)</p>
<p>${esc(b.name)}<br>${esc(b.email)}<br>${esc(b.phone ?? "")}</p>
<p>Deposit paid: ${usd(b.deposit_cents)} of ${usd(b.price_cents)}</p>
${b.notes ? `<p>Notes: ${esc(b.notes)}</p>` : ""}`,
      }),
    );
  } catch (e) {
    errors.push(e);
  }

  // Surface failures to the caller so they are logged; the booking itself is already saved.
  if (errors.length) throw new AggregateError(errors, "booking emails failed");
}

/** Sent when two people paid for overlapping times and the later one is refunded. */
export async function sendConflictEmails(b: BookingRecord, refunded: boolean): Promise<void> {
  const resend = getResend();
  const errors: unknown[] = [];
  try {
    assertSent(
      await resend.emails.send({
        from: from(),
        to: b.email,
        replyTo: owner(),
        subject: `That time was just taken: ${b.service_name}`,
        html: `<p>Hi ${esc(b.name)},</p>
<p>Someone else booked <strong>${esc(when(b))}</strong> a moment before you, so we could not hold it for you.</p>
<p>${refunded ? `Your ${usd(b.deposit_cents)} deposit has been refunded in full and will return to your card in a few business days.` : `We are refunding your ${usd(b.deposit_cents)} deposit by hand and will confirm shortly.`}</p>
<p>Please pick another time on our website, or text ${esc(SITE.phoneDisplay)} and we will find you one.</p>`,
      }),
    );
  } catch (e) {
    errors.push(e);
  }
  try {
    await sendOwnerAlert(
      refunded ? "Double booking caught and refunded" : "ACTION NEEDED: refund a double booking by hand",
      `${b.name} (${b.email}) paid ${usd(b.deposit_cents)} for ${b.service_name}, ${when(b)}, but that time was already taken. ${
        refunded ? "The deposit was refunded automatically." : "The automatic refund FAILED. Refund this payment in the Stripe dashboard."
      }`,
    );
  } catch (e) {
    errors.push(e);
  }
  if (errors.length) throw new AggregateError(errors, "conflict emails failed");
}

export async function sendOwnerAlert(subject: string, text: string): Promise<void> {
  assertSent(await getResend().emails.send({ from: from(), to: owner(), subject, html: `<p>${esc(text)}</p>` }));
}
