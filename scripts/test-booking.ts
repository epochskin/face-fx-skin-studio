// Run with: npm run test:booking
// Pure-logic tests plus the API routes against a throwaway local libsql file database.
// Stripe and Resend are never called: the Stripe client is stubbed, Resend has no key.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(process.env.TEST_DB_DIR ?? tmpdir(), "ffx-test-"));
process.env.TURSO_DATABASE_URL = `file:${join(dir, "test.db")}`;
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";
delete process.env.RESEND_API_KEY;

let passed = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}\n`, e);
    process.exitCode = 1;
  }
}

async function main() {
  const B = await import("../lib/booking");
  const { SERVICES, bySlug } = await import("../lib/services");

  console.log("pure rules");
  await t("parseDuration", () => {
    assert.equal(B.parseDuration("50 min"), 50);
    assert.equal(B.parseDuration("1 hr"), 60);
    assert.equal(B.parseDuration("1 hr 30 min"), 90);
    assert.equal(B.parseDuration("6 hr"), 360);
    for (const s of SERVICES) assert.ok(B.parseDuration(s.duration) > 0, s.slug);
  });
  await t("deposit is 50% and never below Stripe minimum or above price", () => {
    const p = B.pricing(bySlug("fall-reset-facial")!);
    assert.deepEqual(p, { price_cents: 11500, deposit_cents: 5750, balance_cents: 5750 });
    for (const s of SERVICES) {
      const q = B.pricing(s);
      assert.ok(q.deposit_cents >= 50 && q.deposit_cents <= q.price_cents);
    }
  });
  await t("opening windows come from HOURS", () => {
    assert.deepEqual(B.openWindow("2026-10-19"), [480, 1200]); // Monday
    assert.equal(B.openWindow("2026-10-20"), null); // Tuesday closed
    assert.equal(B.openWindow("2026-10-21"), null); // Wednesday closed
    assert.deepEqual(B.openWindow("2026-10-25"), [600, 840]); // Sunday 10-2
  });
  await t("studio time to UTC handles daylight saving", () => {
    assert.equal(new Date(B.studioLocalToUtcMs("2026-10-22", "14:00")).toISOString(), "2026-10-22T19:00:00.000Z"); // CDT
    assert.equal(new Date(B.studioLocalToUtcMs("2026-11-12", "14:00")).toISOString(), "2026-11-12T20:00:00.000Z"); // CST
    assert.equal(new Date(B.studioLocalToUtcMs("2026-03-09", "14:00")).toISOString(), "2026-03-09T19:00:00.000Z"); // CDT after spring forward
  });
  await t("slots: closing time, buffer, closed days, range", () => {
    const now = Date.UTC(2026, 9, 14, 17, 0); // Wed Oct 14 2026, 12:00 CDT
    const monday = "2026-10-19";
    const free = B.computeSlots(60, monday, [], now);
    assert.equal(free[0], "08:00");
    assert.equal(free.at(-1), "19:00"); // a 60 min service must end by 20:00
    // a booking 10:00-11:00 plus a 15 min buffer each side blocks 09:00 through 11:00
    const some = B.computeSlots(60, monday, [{ event_time: "10:00", duration_min: 60 }], now);
    for (const t of ["09:00", "09:30", "10:00", "10:30", "11:00"]) assert.ok(!some.includes(t), `${t} should be blocked`);
    for (const t of ["08:00", "08:30", "11:30"]) assert.ok(some.includes(t), `${t} should be open`);
    assert.deepEqual(B.computeSlots(60, "2026-10-20", [], now), []); // Tuesday closed
    assert.deepEqual(B.computeSlots(60, "2026-10-12", [], now), []); // in the past
    assert.deepEqual(B.computeSlots(60, "2027-03-01", [], now), []); // beyond 90 days
    assert.deepEqual(B.computeSlots(360, "2026-10-25", [], now), []); // 6 hr party cannot fit Sunday 10-2
    assert.ok(B.computeSlots(360, monday, [], now).includes("14:00")); // but fits Monday 8-8
  });
  await t("slots: 12 hour lead time", () => {
    const earlyThu = Date.UTC(2026, 9, 15, 8, 0); // Thu 03:00 CDT -> earliest bookable 15:00 CDT
    assert.equal(B.computeSlots(60, "2026-10-15", [], earlyThu)[0], "15:00");
    const morningThu = Date.UTC(2026, 9, 15, 13, 0); // Thu 08:00 CDT -> earliest 20:00, studio is closing
    assert.deepEqual(B.computeSlots(60, "2026-10-15", [], morningThu), []);
  });

  console.log("database + routes");
  const { initDb, getDb } = await import("../lib/db");
  const { rateLimit } = await import("../lib/rate-limit");
  const { getStripe } = await import("../lib/stripe");
  await initDb();

  await t("rate limiter allows N then blocks", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 7; i++) results.push(await rateLimit("test:key", 5, 600));
    assert.deepEqual(results, [true, true, true, true, true, false, false]);
    assert.equal(await rateLimit("test:other", 5, 600), true);
  });

  // find a date a week or more out that the studio is open
  let date = "";
  for (let i = 8; i < 30 && !date; i++) {
    const d = B.addDays(B.studioToday(), i);
    if (B.openWindow(d)) date = d;
  }
  assert.ok(date);

  const stripe = getStripe();
  let lastSession: Record<string, any> | null = null;
  (stripe.checkout.sessions as any).create = async (params: Record<string, any>) => {
    lastSession = params;
    return { id: "cs_test_created", url: "https://checkout.stripe.test/pay/cs_test_created" };
  };

  const post = (url: string, body: unknown, ip = "9.9.9.9") =>
    new Request(url, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) });

  const { GET: availability } = await import("../app/api/availability/route");
  const { POST: checkout } = await import("../app/api/checkout/route");
  const { POST: webhook } = await import("../app/api/stripe/webhook/route");

  await t("availability returns times and rejects bad input", async () => {
    const ok = await availability(new Request(`https://x.test/api/availability?service=hydrafacial-classic&date=${date}`));
    const j = await ok.json();
    assert.equal(ok.status, 200);
    assert.ok(j.slots.length > 0 && j.slots[0].label);
    const bad = await availability(new Request(`https://x.test/api/availability?service=nope&date=${date}`));
    assert.equal(bad.status, 400);
  });

  const valid = {
    service_id: "hydrafacial-classic",
    event_date: date,
    event_time: "10:00",
    name: "Test Client",
    email: "client@example.com",
    phone: "(504) 555-0100",
    notes: "first visit",
  };

  await t("checkout ignores a client-sent price and charges the server deposit", async () => {
    const res = await checkout(post("https://x.test/api/checkout", { ...valid, amount: 1, price: 1, deposit_cents: 1, amount_cents: 1 }));
    const j = await res.json();
    assert.equal(res.status, 200, JSON.stringify(j));
    assert.ok(j.url.startsWith("https://checkout.stripe.test"));
    const item = lastSession!.line_items[0].price_data;
    assert.equal(item.unit_amount, 9750); // 50% of $195
    assert.equal(lastSession!.metadata.price_cents, "19500");
    assert.deepEqual(lastSession!.allowed_payment_method_types, ["card"]);
  });
  await t("checkout rejects bad details, unknown service, honeypot", async () => {
    for (const patch of [{ email: "nope" }, { phone: "123" }, { name: "" }, { service_id: "free-stuff" }, { event_time: "25:99" }, { event_date: "2026-02-31" }, { company: "bot" }]) {
      const r = await checkout(post("https://x.test/api/checkout", { ...valid, ...patch }, "8.8.8.8"));
      assert.equal(r.status, 400, JSON.stringify(patch));
    }
  });
  await t("checkout rejects a time outside opening hours", async () => {
    const r = await checkout(post("https://x.test/api/checkout", { ...valid, event_time: "23:00" }, "7.7.7.7"));
    assert.equal(r.status, 409);
  });
  await t("checkout is rate limited", async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await checkout(post("https://x.test/api/checkout", { ...valid, email: "bad" }, "6.6.6.6"))).status;
    assert.equal(last, 429);
  });

  const sign = (payload: string, secret = process.env.STRIPE_WEBHOOK_SECRET!) =>
    stripe.webhooks.generateTestHeaderString({ payload, secret });
  const sessionEvent = (id: string, time: string, extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      id: `evt_${id}`,
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id,
          object: "checkout.session",
          payment_status: "paid",
          amount_total: 9750,
          payment_intent: `pi_${id}`,
          metadata: {
            app: "face-fx-booking", service_slug: "hydrafacial-classic", service_name: "HydraFacial Classic",
            event_date: date, event_time: time, duration_min: "60", price_cents: "19500", deposit_cents: "9750",
            name: "Test Client", email: "client@example.com", phone: "(504) 555-0100", notes: "first visit",
            ...extra,
          },
        },
      },
    });
  const hook = (payload: string, sig = sign(payload)) =>
    webhook(new Request("https://x.test/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": sig }, body: payload }));
  const count = async () => Number((await getDb().execute("SELECT COUNT(*) c FROM bookings")).rows[0].c);

  await t("webhook rejects missing and forged signatures", async () => {
    const payload = sessionEvent("cs_test_forged", "10:00");
    assert.equal((await webhook(new Request("https://x.test/w", { method: "POST", body: payload }))).status, 400);
    assert.equal((await hook(payload, sign(payload, "whsec_wrong"))).status, 400);
    assert.equal(await count(), 0);
  });
  await t("webhook saves a paid booking once, even when Stripe retries", async () => {
    const payload = sessionEvent("cs_test_a", "10:00");
    const a = await (await hook(payload)).json();
    assert.equal(a.received, true);
    assert.equal(await count(), 1);
    const again = await (await hook(payload)).json();
    assert.equal(again.duplicate, true);
    assert.equal(await count(), 1);
    const row = (await getDb().execute("SELECT * FROM bookings")).rows[0];
    assert.equal(row.status, "paid");
    assert.equal(Number(row.deposit_cents), 9750);
  });
  await t("a taken time is no longer offered", async () => {
    const r = await availability(new Request(`https://x.test/api/availability?service=hydrafacial-classic&date=${date}`));
    const times = (await r.json()).slots.map((s: { time: string }) => s.time);
    assert.ok(!times.includes("10:00") && !times.includes("10:30") && !times.includes("09:30"));
    const c = await checkout(post("https://x.test/api/checkout", valid, "5.5.5.5"));
    assert.equal(c.status, 409);
  });
  await t("webhook catches a double booking, refunds it, and does not hold the slot", async () => {
    let refundedPi = "";
    (stripe.refunds as any).create = async (p: { payment_intent: string }) => {
      refundedPi = p.payment_intent;
      return { id: "re_test" };
    };
    const body = await (await hook(sessionEvent("cs_test_b", "10:30"))).json();
    assert.equal(body.conflict, true);
    assert.equal(body.refunded, true);
    assert.equal(refundedPi, "pi_cs_test_b");
    const row = (await getDb().execute("SELECT status FROM bookings WHERE stripe_session_id = 'cs_test_b'")).rows[0];
    assert.equal(row.status, "refunded");
  });
  await t("webhook ignores sessions that belong to other products", async () => {
    const before = await count();
    const payload = sessionEvent("cs_test_other", "12:00", { app: "something-else" });
    const j = await (await hook(payload)).json();
    assert.equal(j.ignored, true);
    assert.equal(await count(), before);
  });

  const { buildClientEvent, buildOwnerCalendar } = await import("../lib/ical");
  await t("ics files are valid and carry the right UTC time", () => {
    const row = { id: 1, name: "A", service_name: "Facial", event_date: "2026-10-22", event_time: "14:00", duration_min: 60 };
    const one = buildClientEvent(row);
    assert.match(one, /DTSTART:20261022T190000Z/);
    assert.ok(!one.includes("client@")); // client invite carries no other customer data
    assert.match(buildOwnerCalendar([row]), /BEGIN:VEVENT/);
    assert.match(buildOwnerCalendar([]), /BEGIN:VCALENDAR/);
  });

  const { esc } = await import("../lib/email");
  await t("email escaping neutralises HTML in customer text", () => {
    assert.equal(esc(`<img src=x onerror="a()">`), "&lt;img src=x onerror=&quot;a()&quot;&gt;");
  });

  console.log(`\n${passed} passed${process.exitCode ? ", with failures" : ""}`);
  rmSync(dir, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
