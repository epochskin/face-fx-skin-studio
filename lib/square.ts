// Square Bookings API, used when NEXT_PUBLIC_BOOKING_MODE=square-api.
// The studio's Square calendar is the single source of truth: open times come from Square
// (its hours, staff, buffers and existing appointments) and a booking is created in Square.
// Plain fetch on purpose: no SDK to keep in step. Secrets stay on the server.
import { createHash } from "node:crypto";
import { MAX_ADVANCE_DAYS, STUDIO_TZ, addDays, parseDuration, studioLocalToUtcMs, studioToday } from "./booking";
import { SERVICES, type Service } from "./services";

// Pasted values often carry a trailing space/newline or quotes, which Square answers with a 401. Clean them.
const clean = (v: string | undefined) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
const accessToken = () => clean(process.env.SQUARE_ACCESS_TOKEN);
const locationId = () => clean(process.env.SQUARE_LOCATION_ID);
const isProduction = () => clean(process.env.SQUARE_ENVIRONMENT).toLowerCase() === "production";

export function squareConfigured(): boolean {
  return Boolean(accessToken() && locationId());
}

// Sandbox unless SQUARE_ENVIRONMENT=production, so a missing value can never create real bookings.
const baseUrl = () => (isProduction() ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com");
const apiVersion = () => process.env.SQUARE_API_VERSION || "2025-10-16";

export class SquareError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`Square ${status}: ${detail}`);
  }
}
/** The Square account is not ready for this service (not found in the catalog, no token...). */
export class SquareSetupError extends Error {}
/** The chosen time is gone (someone took it, or Square refused it). */
export class SlotTakenError extends Error {}
/** Square rejected the customer's details (usually the phone number). */
export class BadDetailsError extends Error {}

async function sq<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(baseUrl() + path, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Square-Version": apiVersion(),
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const detail = JSON.stringify(json.errors ?? text).slice(0, 400);
    // 401/403 = the token, its environment (sandbox vs production) or the plan is wrong: a setup problem, not the customer's.
    if (res.status === 401 || res.status === 403) {
      throw new SquareSetupError(`Square ${res.status} on ${baseUrl()}: ${detail} (check SQUARE_ACCESS_TOKEN matches SQUARE_ENVIRONMENT=${isProduction() ? "production" : "sandbox"})`);
    }
    throw new SquareError(res.status, detail);
  }
  return json as T;
}

// ---------- catalog: match our services to the studio's Square services ----------

export type Variation = { id: string; version: number; durationMin: number };
type CatalogObj = {
  id: string;
  version?: number;
  is_deleted?: boolean;
  item_data?: {
    name?: string;
    product_type?: string;
    variations?: {
      id: string;
      version?: number;
      is_deleted?: boolean;
      item_variation_data?: { service_duration?: number; available_for_booking?: boolean };
    }[];
  };
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
let cache: { at: number; bySlug: Map<string, Variation>; unmatched: string[] } | null = null;
export const resetSquareCache = () => {
  cache = null;
};

async function catalog() {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache;
  const items = new Map<string, CatalogObj[]>();
  let cursor: string | undefined;
  do {
    const q = new URLSearchParams({ types: "ITEM" });
    if (cursor) q.set("cursor", cursor);
    const r = await sq<{ objects?: CatalogObj[]; cursor?: string }>("GET", `/v2/catalog/list?${q}`);
    for (const o of r.objects ?? []) {
      if (o.is_deleted || o.item_data?.product_type !== "APPOINTMENTS_SERVICE") continue;
      const key = norm(o.item_data?.name ?? "");
      items.set(key, [...(items.get(key) ?? []), o]);
    }
    cursor = r.cursor;
  } while (cursor);

  const bySlug = new Map<string, Variation>();
  const unmatched: string[] = [];
  for (const s of SERVICES) {
    const want = parseDuration(s.duration);
    const vars = (items.get(norm(s.name)) ?? [])
      .flatMap((o) => o.item_data?.variations ?? [])
      .filter((v) => !v.is_deleted && v.item_variation_data?.available_for_booking !== false)
      .map((v) => ({
        id: v.id,
        version: v.version ?? 0,
        durationMin: Math.round((v.item_variation_data?.service_duration ?? 0) / 60000),
      }));
    // Prefer the variation whose length matches our menu; otherwise the first bookable one.
    const pick = vars.find((v) => v.durationMin === want) ?? vars[0];
    if (pick) bySlug.set(s.slug, pick);
    else unmatched.push(s.name);
  }
  if (unmatched.length) console.warn("square: services not found in the Square catalog:", unmatched.join(", "));
  cache = { at: Date.now(), bySlug, unmatched };
  return cache;
}

async function variationFor(service: Service): Promise<Variation> {
  const v = (await catalog()).bySlug.get(service.slug);
  if (!v) throw new SquareSetupError(`"${service.name}" was not found as a bookable service in Square`);
  return v;
}

// ---------- time helpers ----------

const localFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: STUDIO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
/** UTC ISO timestamp -> studio-local date (yyyy-mm-dd) and time (HH:MM). */
export function utcToStudio(iso: string): { date: string; time: string } {
  const p = localFmt.formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}

const DAY_MS = 86_400_000;

// ---------- availability ----------

type Segment = {
  duration_minutes: number;
  service_variation_id: string;
  service_variation_version: number;
  team_member_id: string;
};
type Availability = { start_at: string; appointment_segments: Segment[] };

async function search(v: Variation, startMs: number, endMs: number): Promise<Availability[]> {
  const r = await sq<{ availabilities?: Availability[] }>("POST", "/v2/bookings/availability/search", {
    query: {
      filter: {
        start_at_range: { start_at: new Date(startMs).toISOString(), end_at: new Date(endMs).toISOString() },
        location_id: locationId(),
        segment_filters: [{ service_variation_id: v.id }],
      },
    },
  });
  return r.availabilities ?? [];
}

/** Open start times ("HH:MM", studio time) for a service on a studio-local date, straight from Square. */
export async function squareTimes(service: Service, date: string, nowMs = Date.now()): Promise<string[]> {
  const today = studioToday(nowMs);
  if (date < today || date > addDays(today, MAX_ADVANCE_DAYS)) return [];
  const v = await variationFor(service);
  // Square needs a future start and a range of at least 24 hours; results are trimmed to the day below.
  const start = Math.max(studioLocalToUtcMs(date, "00:00"), nowMs + 5 * 60_000);
  const end = Math.max(studioLocalToUtcMs(addDays(date, 1), "00:00"), start + DAY_MS);
  const times = new Set<string>();
  for (const a of await search(v, start, end)) {
    const l = utcToStudio(a.start_at);
    if (l.date === date) times.add(l.time);
  }
  return [...times].sort();
}

async function findSlot(service: Service, date: string, time: string): Promise<Availability | null> {
  const v = await variationFor(service);
  const slotMs = studioLocalToUtcMs(date, time);
  if (slotMs < Date.now() + 60_000) return null;
  const found = (await search(v, slotMs, slotMs + DAY_MS)).find((a) => new Date(a.start_at).getTime() === slotMs);
  return found?.appointment_segments?.length ? found : null;
}

// ---------- customer + booking ----------

/** "(504) 872-4953" -> "+15048724953" */
export function toE164(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return `+${d}`;
}

const hash = (...parts: string[]) => createHash("sha256").update(parts.join("|")).digest("hex");

async function customerId(name: string, email: string, phone: string): Promise<string> {
  try {
    const found = await sq<{ customers?: { id: string }[] }>("POST", "/v2/customers/search", {
      query: { filter: { email_address: { exact: email } } },
      limit: 1,
    });
    if (found.customers?.[0]) return found.customers[0].id;
    const [given, ...rest] = name.split(/\s+/);
    const made = await sq<{ customer: { id: string } }>("POST", "/v2/customers", {
      idempotency_key: `fxc-${hash(email).slice(0, 40)}`,
      given_name: given,
      family_name: rest.join(" ") || undefined,
      email_address: email,
      phone_number: toE164(phone),
    });
    return made.customer.id;
  } catch (e) {
    if (e instanceof SquareError && e.status === 400) {
      throw new BadDetailsError("Please check your email and phone number and try again.");
    }
    throw e;
  }
}

export type NewBooking = {
  service: Service;
  event_date: string;
  event_time: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
};

/** Creates the appointment in Square. Returns the Square booking id. */
export async function bookSlot(b: NewBooking): Promise<{ id: string; status: string }> {
  const slot = await findSlot(b.service, b.event_date, b.event_time);
  if (!slot) throw new SlotTakenError("slot not open in Square");
  const seg = slot.appointment_segments[0];
  const cid = await customerId(b.name, b.email, b.phone);
  try {
    const r = await sq<{ booking: { id: string; status: string } }>("POST", "/v2/bookings", {
      // Same person + service + start time = same key, so a double click cannot book twice.
      idempotency_key: `fx-${hash(b.email, b.service.slug, slot.start_at).slice(0, 40)}`,
      booking: {
        start_at: slot.start_at,
        location_id: locationId(),
        customer_id: cid,
        customer_note: b.notes || undefined,
        appointment_segments: [
          {
            duration_minutes: seg.duration_minutes,
            service_variation_id: seg.service_variation_id,
            service_variation_version: seg.service_variation_version,
            team_member_id: seg.team_member_id,
          },
        ],
      },
    });
    return r.booking;
  } catch (e) {
    // 401/403 = token or plan problem (a setup issue), 429/5xx = Square trouble: let those surface as errors.
    if (e instanceof SquareError && [400, 404, 409].includes(e.status)) throw new SlotTakenError(e.detail);
    throw e;
  }
}

/** For the confirmation page: the booking's service, date and time, only for a live booking at our location. */
export async function describeBooking(id: string): Promise<{ service: string; date: string; time: string } | null> {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id) || !squareConfigured()) return null;
  try {
    const { booking: b } = await sq<{
      booking: { location_id?: string; status?: string; start_at?: string; appointment_segments?: Segment[] };
    }>("GET", `/v2/bookings/${id}`);
    if (b.location_id !== locationId() || !b.start_at || !["ACCEPTED", "PENDING"].includes(b.status ?? "")) return null;
    const varId = b.appointment_segments?.[0]?.service_variation_id;
    const cat = await catalog();
    const slug = [...cat.bySlug].find(([, v]) => v.id === varId)?.[0];
    const { date, time } = utcToStudio(b.start_at);
    return { service: SERVICES.find((s) => s.slug === slug)?.name ?? "Your appointment", date, time };
  } catch {
    return null;
  }
}

/** For `npm run square:check`: confirms the token, the location and which services line up. */
export async function squareStatus() {
  const loc = await sq<{ location: { id: string; name?: string; status?: string } }>("GET", `/v2/locations/${locationId()}`);
  const cat = await catalog();
  return {
    environment: isProduction() ? "production" : "sandbox",
    location: loc.location,
    mapped: SERVICES.filter((s) => cat.bySlug.has(s.slug)).map((s) => ({ name: s.name, ...cat.bySlug.get(s.slug)! })),
    unmatched: cat.unmatched,
  };
}
