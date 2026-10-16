import { createEvent, createEvents, type EventAttributes } from "ics";
import { studioLocalToUtcMs } from "./booking";
import { SITE } from "./site";

export type CalRow = {
  id?: number | string;
  name: string;
  email?: string;
  phone?: string | null;
  notes?: string | null;
  service_name: string;
  event_date: string;
  event_time: string;
  duration_min: number;
};

// Times are written in UTC so every calendar app shows the right local time.
function start(row: CalRow): EventAttributes["start"] {
  const d = new Date(studioLocalToUtcMs(row.event_date, row.event_time));
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()];
}

const where = `${SITE.name}, ${SITE.street}, ${SITE.cityLine} (inside ${SITE.locatedInside})`;

/** Event for the client: only their own appointment, no other customer data. */
export function buildClientEvent(row: CalRow): string {
  const { error, value } = createEvent({
    uid: `booking-${row.id ?? `${row.event_date}-${row.event_time}`}@face-fx-skin-studio`,
    title: `${row.service_name} at ${SITE.name}`,
    start: start(row),
    startInputType: "utc",
    startOutputType: "utc",
    duration: { minutes: row.duration_min },
    location: where,
    description: `Questions? Text or call ${SITE.phoneDisplay}.`,
    status: "CONFIRMED",
  });
  if (error || !value) throw error ?? new Error("ics generation failed");
  return value;
}

/** Event for the owner: includes the client's details. */
export function buildOwnerEvent(row: CalRow): string {
  const { error, value } = createEvent(ownerEvent(row));
  if (error || !value) throw error ?? new Error("ics generation failed");
  return value;
}

function ownerEvent(row: CalRow): EventAttributes {
  return {
    uid: `booking-${row.id ?? `${row.event_date}-${row.event_time}`}@face-fx-skin-studio`,
    title: `${row.service_name} - ${row.name}`,
    start: start(row),
    startInputType: "utc",
    startOutputType: "utc",
    duration: { minutes: row.duration_min },
    location: where,
    description: [`${row.name}`, row.email, row.phone, row.notes].filter(Boolean).join("\n"),
    status: "CONFIRMED",
  };
}

/** Whole-calendar feed for the owner (paid bookings). */
export function buildOwnerCalendar(rows: CalRow[]): string {
  if (rows.length === 0) return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Face FX Skin Studio//Bookings//EN\r\nEND:VCALENDAR\r\n";
  const { error, value } = createEvents(rows.map(ownerEvent));
  if (error || !value) throw error ?? new Error("ics generation failed");
  return value;
}
