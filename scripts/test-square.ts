// Run with: npm run test:square
// square-api mode against a stubbed Square (global fetch). Nothing real is called, no database is used.
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_BOOKING_MODE = "square-api";
process.env.SQUARE_ACCESS_TOKEN = "test-token";
process.env.SQUARE_LOCATION_ID = "LOC1";
process.env.SQUARE_ENVIRONMENT = "sandbox";
delete process.env.TURSO_DATABASE_URL;

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

type Call = { host: string; method: string; path: string; body: any; headers: Record<string, string> };
let calls: Call[] = [];
let handler: (c: Call) => { status?: number; json: unknown } = () => ({ json: {} });
globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
  const u = new URL(url);
  const c: Call = {
    host: u.host,
    method: init.method ?? "GET",
    path: u.pathname + u.search,
    body: init.body ? JSON.parse(String(init.body)) : undefined,
    headers: init.headers as Record<string, string>,
  };
  calls.push(c);
  const r = handler(c);
  return new Response(JSON.stringify(r.json), { status: r.status ?? 200 });
}) as typeof fetch;

async function main() {
  const B = await import("../lib/booking");
  const S = await import("../lib/square");
  const { bySlug } = await import("../lib/services");
  const avail = await import("../app/api/availability/route");
  const checkout = await import("../app/api/checkout/route");
  const { rateLimit } = await import("../lib/rate-limit");
  const svc = bySlug("fall-reset-facial")!; // "Fall Reset Facial", 50 min

  // A future open day (not Tue/Wed) at least 3 days out, and two slots on it.
  let date = B.addDays(B.studioToday(), 3);
  while (B.openWindow(date) === null) date = B.addDays(date, 1);
  const utc = (d: string, hhmm: string) => new Date(B.studioLocalToUtcMs(d, hhmm)).toISOString();
  const seg = { duration_minutes: 50, service_variation_id: "VAR1", service_variation_version: 7, team_member_id: "TM1" };

  const catalogJson = {
    objects: [
      {
        id: "ITEM1",
        item_data: {
          name: "Fall Reset Facial",
          product_type: "APPOINTMENTS_SERVICE",
          variations: [{ id: "VAR1", version: 7, item_variation_data: { service_duration: 3000000, available_for_booking: true } }],
        },
      },
      { id: "SHOP", item_data: { name: "Fall Reset Facial", product_type: "REGULAR", variations: [{ id: "NOPE" }] } },
    ],
  };
  const base = (c: Call) => {
    if (c.path.startsWith("/v2/catalog/list")) return { json: catalogJson };
    return null;
  };
  let ip = 0; // a fresh visitor per request, so the limiter does not trip on unrelated tests
  const post = (path: string, body: unknown) =>
    new Request(`https://example.test${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}` },
      body: JSON.stringify(body),
    });
  const form = (over: Record<string, unknown> = {}) => ({
    service_id: svc.slug,
    event_date: date,
    event_time: "10:00",
    name: "Jane Doe",
    email: "Jane@Example.com",
    phone: "(504) 555-0123",
    notes: "first visit",
    company: "",
    ...over,
  });

  console.log("helpers");
  await t("utcToStudio handles CDT and CST", () => {
    assert.deepEqual(S.utcToStudio("2026-10-22T19:00:00Z"), { date: "2026-10-22", time: "14:00" });
    assert.deepEqual(S.utcToStudio("2026-11-12T20:00:00Z"), { date: "2026-11-12", time: "14:00" });
    assert.deepEqual(S.utcToStudio("2026-10-23T05:00:00Z"), { date: "2026-10-23", time: "00:00" });
  });
  await t("toE164", () => {
    assert.equal(S.toE164("(504) 872-4953"), "+15048724953");
    assert.equal(S.toE164("1-504-872-4953"), "+15048724953");
  });

  console.log("availability");
  await t("times come from Square, deduped, trimmed to the day, sorted", async () => {
    S.resetSquareCache();
    calls = [];
    handler = (c) =>
      base(c) ??
      ({
        json: {
          availabilities: [
            { start_at: utc(date, "14:30"), appointment_segments: [seg] },
            { start_at: utc(date, "10:00"), appointment_segments: [seg] },
            { start_at: utc(date, "10:00"), appointment_segments: [{ ...seg, team_member_id: "TM2" }] },
            { start_at: utc(B.addDays(date, 1), "00:30"), appointment_segments: [seg] }, // next day: dropped
          ],
        },
      });
    const r = await avail.GET(new Request(`https://example.test/api/availability?service=${svc.slug}&date=${date}`));
    const j = await r.json();
    assert.equal(r.status, 200);
    assert.deepEqual(j.slots.map((s: any) => s.time), ["10:00", "14:30"]);
    assert.equal(j.slots[0].label, "10:00 am");
    const s = calls.find((c) => c.path === "/v2/bookings/availability/search")!;
    assert.equal(s.body.query.filter.location_id, "LOC1");
    assert.equal(s.body.query.filter.segment_filters[0].service_variation_id, "VAR1"); // not the REGULAR item
    const span = Date.parse(s.body.query.filter.start_at_range.end_at) - Date.parse(s.body.query.filter.start_at_range.start_at);
    assert.ok(span >= 86_400_000, "range must be at least 24h");
    assert.equal(s.headers["Authorization"], "Bearer test-token");
    assert.ok(calls[0].path.startsWith("/v2/catalog/list"));
  });
  await t("sandbox host by default, production host only when asked", async () => {
    assert.ok(calls.length > 0 && calls.every((c) => c.host === "connect.squareupsandbox.com"));
    process.env.SQUARE_ENVIRONMENT = "production";
    calls = [];
    handler = () => ({ json: {} });
    await S.describeBooking("BOOK1234ABCD");
    assert.equal(calls[0].host, "connect.squareup.com");
    process.env.SQUARE_ENVIRONMENT = "sandbox";
  });
  await t("a day outside the booking window returns no times without calling Square", async () => {
    calls = [];
    const far = B.addDays(B.studioToday(), B.MAX_ADVANCE_DAYS + 5);
    const r = await avail.GET(new Request(`https://example.test/api/availability?service=${svc.slug}&date=${far}`));
    assert.deepEqual((await r.json()).slots, []);
    assert.ok(!calls.some((c) => c.path.includes("availability/search")));
  });
  await t("service missing from Square -> 503 with a friendly message", async () => {
    S.resetSquareCache();
    handler = () => ({ json: { objects: [] } });
    const r = await avail.GET(new Request(`https://example.test/api/availability?service=${svc.slug}&date=${date}`));
    assert.equal(r.status, 503);
    assert.match((await r.json()).error, /being set up/);
  });

  console.log("checkout (creates the Square booking)");
  const happy = (c: Call) => {
    const b = base(c);
    if (b) return b;
    if (c.path === "/v2/bookings/availability/search")
      return { json: { availabilities: [{ start_at: utc(date, "10:00"), appointment_segments: [seg] }] } };
    if (c.path === "/v2/customers/search") return { json: {} };
    if (c.path === "/v2/customers") return { json: { customer: { id: "CUST1" } } };
    if (c.path === "/v2/bookings") return { json: { booking: { id: "BOOK1234ABCD", status: "ACCEPTED" } } };
    return { status: 404, json: { errors: [{ code: "NOT_FOUND" }] } };
  };
  await t("creates customer then booking with Square's own segment details", async () => {
    S.resetSquareCache();
    calls = [];
    handler = happy;
    const r = await checkout.POST(post("/api/checkout", form()));
    const j = await r.json();
    assert.equal(r.status, 200);
    assert.equal(j.url, "/booking/success?booking=BOOK1234ABCD");
    const cust = calls.find((c) => c.path === "/v2/customers")!.body;
    assert.equal(cust.email_address, "jane@example.com");
    assert.equal(cust.phone_number, "+15045550123");
    assert.equal(cust.given_name, "Jane");
    assert.equal(cust.family_name, "Doe");
    const bk = calls.find((c) => c.path === "/v2/bookings")!.body;
    assert.equal(bk.booking.start_at, utc(date, "10:00"));
    assert.equal(bk.booking.location_id, "LOC1");
    assert.equal(bk.booking.customer_id, "CUST1");
    assert.equal(bk.booking.customer_note, "first visit");
    assert.deepEqual(bk.booking.appointment_segments, [seg]);
  });
  await t("same request twice uses the same idempotency key", async () => {
    calls = [];
    await checkout.POST(post("/api/checkout", form()));
    await checkout.POST(post("/api/checkout", form()));
    const keys = calls.filter((c) => c.path === "/v2/bookings").map((c) => c.body.idempotency_key);
    assert.equal(keys.length, 2);
    assert.equal(keys[0], keys[1]);
    assert.ok(keys[0].length <= 45);
  });
  await t("existing Square customer is reused", async () => {
    calls = [];
    handler = (c) => (c.path === "/v2/customers/search" ? { json: { customers: [{ id: "OLD" }] } } : happy(c));
    await checkout.POST(post("/api/checkout", form()));
    assert.ok(!calls.some((c) => c.path === "/v2/customers"));
    assert.equal(calls.find((c) => c.path === "/v2/bookings")!.body.booking.customer_id, "OLD");
  });
  await t("time not offered by Square -> 409, nothing booked", async () => {
    calls = [];
    handler = (c) => (c.path === "/v2/bookings/availability/search" ? { json: { availabilities: [] } } : happy(c));
    const r = await checkout.POST(post("/api/checkout", form()));
    assert.equal(r.status, 409);
    assert.ok(!calls.some((c) => c.path === "/v2/bookings"));
  });
  await t("Square refuses the booking (400) -> 409", async () => {
    handler = (c) => (c.path === "/v2/bookings" ? { status: 400, json: { errors: [{ code: "BAD_REQUEST" }] } } : happy(c));
    assert.equal((await checkout.POST(post("/api/checkout", form()))).status, 409);
  });
  await t("bad token (401) is a 'being set up' error, never 'time taken'", async () => {
    handler = (c) => (c.path === "/v2/bookings" ? { status: 401, json: { errors: [{ code: "UNAUTHORIZED" }] } } : happy(c));
    const r = await checkout.POST(post("/api/checkout", form()));
    assert.equal(r.status, 503);
    assert.match((await r.json()).error, /being set up/);
  });
  await t("401 while loading times -> 503 with the same friendly message", async () => {
    S.resetSquareCache();
    handler = () => ({ status: 401, json: { errors: [{ code: "UNAUTHORIZED" }] } });
    const r = await avail.GET(new Request(`https://example.test/api/availability?service=${svc.slug}&date=${date}`));
    assert.equal(r.status, 503);
    assert.match((await r.json()).error, /being set up/);
  });
  await t("pasted spaces, quotes and capital letters in the Square settings are tolerated", async () => {
    S.resetSquareCache();
    const keep = { ...process.env };
    process.env.SQUARE_ACCESS_TOKEN = '  "test-token"\n';
    process.env.SQUARE_LOCATION_ID = " LOC1 ";
    process.env.SQUARE_ENVIRONMENT = " Production ";
    calls = [];
    handler = (c) => base(c) ?? { json: { availabilities: [] } };
    await S.squareTimes(svc, date);
    assert.ok(calls.length > 0 && calls.every((c) => c.host === "connect.squareup.com"));
    assert.equal(calls[0].headers["Authorization"], "Bearer test-token");
    assert.equal(calls.find((c) => c.path.includes("availability/search"))!.body.query.filter.location_id, "LOC1");
    process.env.SQUARE_ACCESS_TOKEN = keep.SQUARE_ACCESS_TOKEN;
    process.env.SQUARE_LOCATION_ID = keep.SQUARE_LOCATION_ID;
    process.env.SQUARE_ENVIRONMENT = keep.SQUARE_ENVIRONMENT;
    S.resetSquareCache();
  });
  await t("Square rejects the customer details (400) -> 400 with a clear message", async () => {
    handler = (c) => (c.path === "/v2/customers" ? { status: 400, json: { errors: [{ code: "INVALID_PHONE" }] } } : happy(c));
    const r = await checkout.POST(post("/api/checkout", form()));
    assert.equal(r.status, 400);
    assert.match((await r.json()).error, /email and phone/);
  });
  await t("honeypot and bad input never reach Square", async () => {
    calls = [];
    handler = happy;
    assert.equal((await checkout.POST(post("/api/checkout", form({ company: "x" })))).status, 400);
    assert.equal((await checkout.POST(post("/api/checkout", form({ email: "nope" })))).status, 400);
    assert.equal((await checkout.POST(post("/api/checkout", form({ service_id: "nope" })))).status, 400);
    assert.equal(calls.length, 0);
  });

  console.log("confirmation + demo + limiter");
  await t("describeBooking: live booking at our location only", async () => {
    S.resetSquareCache();
    const good = { booking: { location_id: "LOC1", status: "ACCEPTED", start_at: utc(date, "10:00"), appointment_segments: [seg] } };
    handler = (c) => base(c) ?? { json: good };
    assert.deepEqual(await S.describeBooking("BOOK1234ABCD"), { service: "Fall Reset Facial", date, time: "10:00" });
    handler = (c) => base(c) ?? { json: { booking: { ...good.booking, location_id: "OTHER" } } };
    assert.equal(await S.describeBooking("BOOK1234ABCD"), null);
    handler = (c) => base(c) ?? { json: { booking: { ...good.booking, status: "CANCELLED_BY_CUSTOMER" } } };
    assert.equal(await S.describeBooking("BOOK1234ABCD"), null);
    assert.equal(await S.describeBooking("../etc"), null);
  });
  await t("without Square keys the flow is a harmless demo and never calls Square", async () => {
    const tok = process.env.SQUARE_ACCESS_TOKEN;
    delete process.env.SQUARE_ACCESS_TOKEN;
    calls = [];
    const r = await checkout.POST(post("/api/checkout", form()));
    const j = await r.json();
    assert.equal(r.status, 200);
    assert.match(j.url, /^\/booking\/success\?demo=1/);
    assert.equal(calls.length, 0);
    process.env.SQUARE_ACCESS_TOKEN = tok;
  });
  await t("checkout limiter returns 429 after 10 tries from one visitor", async () => {
    handler = happy;
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) {
      const r = new Request("https://example.test/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "7.7.7.7" },
        body: JSON.stringify(form({ email: "nope" })),
      });
      codes.push((await checkout.POST(r)).status);
    }
    assert.equal(codes.filter((c) => c === 429).length, 2);
  });
  await t("rate limiter works with no database", async () => {
    const results = [];
    for (let i = 0; i < 12; i++) results.push(await rateLimit("test:key", 10, 600));
    assert.equal(results.filter(Boolean).length, 10);
  });

  console.log(`\n${passed} passed${process.exitCode ? ", with failures" : ""}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
