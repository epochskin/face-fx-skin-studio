import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { isDate, isTime, toMin } from "@/lib/booking";
import { slotTaken } from "@/lib/booking-db";
import { dbConfigured, getDb, initDb } from "@/lib/db";
import { sendBookingEmails, sendConflictEmails, type BookingRecord } from "@/lib/email";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ok = (extra: Record<string, unknown> = {}) => NextResponse.json({ received: true, ...extra });

// Source of truth for bookings: a booking only exists once Stripe confirms payment.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !secret || !dbConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const raw = await req.text(); // raw body: never parse before verifying

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") return ok();
  const s = event.data.object as Stripe.Checkout.Session;
  if (s.payment_status !== "paid") return ok();

  const m = s.metadata ?? {};
  if (m.app !== "face-fx-booking") return ok({ ignored: true }); // some other product on this Stripe account

  const date = m.event_date ?? "";
  const time = m.event_time ?? "";
  const duration = Number(m.duration_min);
  if (!isDate(date) || !isTime(time) || !Number.isInteger(duration) || duration <= 0 || !m.email || !m.name) {
    console.error("webhook: booking metadata invalid for session", s.id);
    return ok({ ignored: true });
  }

  const rec: BookingRecord = {
    name: m.name,
    email: m.email,
    phone: m.phone || null,
    notes: m.notes || null,
    service_name: m.service_name ?? m.service_slug ?? "Appointment",
    event_date: date,
    event_time: time,
    duration_min: duration,
    price_cents: Number(m.price_cents) || 0,
    deposit_cents: s.amount_total ?? (Number(m.deposit_cents) || 0),
  };
  const paymentIntent = typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null);

  // ---- save the row (idempotent, and checked against double booking) ----
  let status: "paid" | "conflict";
  try {
    await initDb();
    const tx = await getDb().transaction("write");
    try {
      const dup = await tx.execute({ sql: `SELECT id FROM bookings WHERE stripe_session_id = ?`, args: [s.id] });
      if (dup.rows.length > 0) {
        await tx.commit();
        return ok({ duplicate: true }); // Stripe retry: already handled, send nothing twice
      }
      status = (await slotTaken(date, toMin(time), duration, tx)) ? "conflict" : "paid";
      const ins = await tx.execute({
        sql: `INSERT INTO bookings
              (name, email, phone, service_slug, service_name, event_date, event_time, duration_min,
               price_cents, deposit_cents, notes, stripe_session_id, payment_intent, status)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              RETURNING id`,
        args: [
          rec.name, rec.email, rec.phone ?? null, m.service_slug ?? "", rec.service_name, date, time, duration,
          rec.price_cents, rec.deposit_cents, rec.notes ?? null, s.id, paymentIntent, status,
        ],
      });
      rec.id = Number(ins.rows[0].id);
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }
  } catch (err) {
    console.error("webhook: saving booking failed", s.id, err);
    return NextResponse.json({ error: "Could not save booking" }, { status: 500 }); // Stripe will retry
  }

  // ---- normal case: confirm ----
  if (status === "paid") {
    try {
      await sendBookingEmails(rec);
    } catch (err) {
      console.error("webhook: booking emails failed (booking is saved)", s.id, err);
    }
    return ok();
  }

  // ---- someone paid for a slot that was taken a moment earlier: refund and tell both sides ----
  let refunded = false;
  try {
    if (!paymentIntent) throw new Error("no payment intent on session");
    await getStripe().refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `refund-${s.id}` });
    await getDb().execute({ sql: `UPDATE bookings SET status = 'refunded' WHERE stripe_session_id = ?`, args: [s.id] });
    refunded = true;
  } catch (err) {
    console.error("webhook: automatic refund failed, refund by hand", s.id, err);
  }
  try {
    await sendConflictEmails(rec, refunded);
  } catch (err) {
    console.error("webhook: conflict emails failed", s.id, err);
  }
  return ok({ conflict: true, refunded });
}
