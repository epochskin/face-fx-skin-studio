// Pure booking rules: durations, deposits, studio hours and slot availability.
// No network, no database. Everything that decides price or time lives here, on
// the server side of the app, so the browser can only ever pick an id and a slot.
import { HOURS } from "./site";
import type { Service } from "./services";

export const STUDIO_TZ = "America/Chicago";

// Business rules. Confirm these with the studio before going live.
export const SLOT_STEP_MIN = 30; // start times are offered every 30 minutes
export const BUFFER_MIN = 15; // gap kept between appointments (one specialist, one room)
export const MIN_LEAD_HOURS = 12; // earliest bookable time from now
export const MAX_ADVANCE_DAYS = 90; // furthest bookable day from today
export const DEPOSIT_PERCENT = 50; // share of the price collected online, rest paid at the studio

export type Booked = { event_time: string; duration_min: number };

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "50 min" -> 50, "1 hr" -> 60, "1 hr 30 min" -> 90, "6 hr" -> 360 */
export function parseDuration(text: string): number {
  const h = /(\d+)\s*hr/i.exec(text);
  const m = /(\d+)\s*min/i.exec(text);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}

export function pricing(s: Service) {
  const price_cents = Math.round(s.price * 100);
  const deposit_cents = Math.min(price_cents, Math.max(50, Math.round((price_cents * DEPOSIT_PERCENT) / 100)));
  return { price_cents, deposit_cents, balance_cents: price_cents - deposit_cents };
}

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const fromMin = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export function isDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** "14:30" -> "2:30 pm" */
export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ap}`;
}

/** "2026-10-20" -> "Tuesday, October 20, 2026" */
export function fmtDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Opening window for a studio-local date in minutes from midnight, or null when closed. Read from HOURS. */
export function openWindow(date: string): [number, number] | null {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const row = HOURS.find((h) => h.day === DAY_NAMES[dow]);
  if (!row || row.hours === "Closed") return null;
  const t = [...row.hours.matchAll(/(\d{1,2}):(\d{2})\s*(am|pm)/gi)];
  if (t.length !== 2) return null;
  const mins = t.map((x) => (Number(x[1]) % 12) * 60 + Number(x[2]) + (/pm/i.test(x[3]) ? 720 : 0));
  return [mins[0], mins[1]];
}

function offsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: STUDIO_TZ, timeZoneName: "longOffset" }).formatToParts(
    new Date(utcMs),
  );
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const mt = /GMT([+-])(\d{2}):(\d{2})/.exec(tz);
  if (!mt) return 0;
  return (mt[1] === "-" ? -1 : 1) * (Number(mt[2]) * 60 + Number(mt[3])) * 60000;
}

/** Studio-local date + "HH:MM" -> UTC epoch ms (handles daylight saving). */
export function studioLocalToUtcMs(date: string, hhmm: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const first = guess - offsetMs(guess);
  return guess - offsetMs(first);
}

/** Today's date in the studio's time zone, yyyy-mm-dd. */
export function studioToday(nowMs = Date.now()): string {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(nowMs));
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** True when [start, start+dur) is too close to an existing booking (buffer included). */
export function conflicts(startMin: number, durationMin: number, booked: Booked[]): boolean {
  const end = startMin + durationMin;
  return booked.some((b) => {
    const bs = toMin(b.event_time);
    const be = bs + b.duration_min;
    return startMin < be + BUFFER_MIN && bs < end + BUFFER_MIN;
  });
}

/** Open start times ("HH:MM") for a service of `durationMin` on `date`. */
export function computeSlots(durationMin: number, date: string, booked: Booked[], nowMs = Date.now()): string[] {
  if (!isDate(date) || durationMin <= 0) return [];
  const today = studioToday(nowMs);
  if (date < today || date > addDays(today, MAX_ADVANCE_DAYS)) return [];
  const win = openWindow(date);
  if (!win) return [];
  const [open, close] = win;
  const out: string[] = [];
  for (let start = open; start + durationMin <= close; start += SLOT_STEP_MIN) {
    const hhmm = fromMin(start);
    if (studioLocalToUtcMs(date, hhmm) < nowMs + MIN_LEAD_HOURS * 3600_000) continue;
    if (conflicts(start, durationMin, booked)) continue;
    out.push(hhmm);
  }
  return out;
}
