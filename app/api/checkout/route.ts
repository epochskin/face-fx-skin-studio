import { NextResponse } from "next/server";
import { computeSlots, fmtDate, fmtTime, isDate, isTime, parseDuration, pricing } from "@/lib/booking";
import { bookedOn } from "@/lib/booking-db";
import { isDemo } from "@/lib/demo";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { bySlug } from "@/lib/services";
import { IS_SQUARE_API } from "@/lib/site";
import { BadDetailsError, SlotTakenError, SquareSetupError, bookSlot } from "@/lib/square";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The browser sends a service id, a slot and contact details. It never sends an
// amount: price, deposit and duration are all derived here from lib/services.ts.
const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  const demo = isDemo();

  try {
    if (!demo && !(await rateLimit(`checkout:${clientIp(req)}`, 10, 600))) return bad("Too many requests", 429);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid request");
    }
    // Hidden field a real person never fills in.
    if (clean(body.company, 50)) return bad("Invalid booking details");

    const service = bySlug(clean(body.service_id, 60));
    const event_date = clean(body.event_date, 10);
    const event_time = clean(body.event_time, 5);
    const name = clean(body.name, 100);
    const email = clean(body.email, 120).toLowerCase();
    const phone = clean(body.phone, 30);
    const notes = clean(body.notes, 400);

    if (
      !service ||
      !isDate(event_date) ||
      !isTime(event_time) ||
      name.length < 2 ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
      phone.replace(/\D/g, "").length < 10 ||
      !/^[0-9+()\-.\s]+$/.test(phone)
    ) {
      return bad("Please check your details and try again.");
    }

    // square-api mode: Square checks the time is open and creates the appointment. No card is taken here.
    if (IS_SQUARE_API && !demo) {
      try {
        const b = await bookSlot({ service, event_date, event_time, name, email, phone, notes });
        return NextResponse.json({ url: `/booking/success?${new URLSearchParams({ booking: b.id })}` });
      } catch (err) {
        if (err instanceof SlotTakenError) return bad("That time is no longer available. Please pick another.", 409);
        if (err instanceof BadDetailsError) return bad(err.message);
        if (err instanceof SquareSetupError) return bad("Online booking is being set up. Please text or call the studio.", 503);
        throw err;
      }
    }

    // The slot must be genuinely open right now (hours, lead time, existing bookings).
    const duration_min = parseDuration(service.duration);
    const open = computeSlots(duration_min, event_date, demo ? [] : await bookedOn(event_date));
    if (!open.includes(event_time)) return bad("That time is no longer available. Please pick another.", 409);

    const { price_cents, deposit_cents } = pricing(service);

    // Demo mode: no keys yet. Walk the customer to a sample confirmation. Nothing is charged or saved.
    if (demo) {
      const q = new URLSearchParams({ demo: "1", service: service.slug, date: event_date, time: event_time, email });
      return NextResponse.json({ url: `/booking/success?${q}` });
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"], // SDK v23 replaced payment_method_types with this filter
      customer_email: email,
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: deposit_cents,
            product_data: {
              name: `${service.name} deposit`,
              description: `${fmtDate(event_date)} at ${fmtTime(event_time)}`,
            },
          },
        },
      ],
      payment_intent_data: { description: `Face FX deposit: ${service.name}, ${event_date} ${event_time}` },
      success_url: `${base}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/book?service=${service.slug}&canceled=1`,
      // Stripe allows 500 characters per value; everything here is length-capped above.
      metadata: {
        app: "face-fx-booking",
        service_slug: service.slug,
        service_name: service.name,
        event_date,
        event_time,
        duration_min: String(duration_min),
        price_cents: String(price_cents),
        deposit_cents: String(deposit_cents),
        name,
        email,
        phone,
        notes,
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout failed", err); // detail stays in the server logs
    return bad("Could not start checkout. Please try again.", 500);
  }
}
