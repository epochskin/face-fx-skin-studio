import type { Client, Transaction } from "@libsql/client";
import { getDb, initDb } from "./db";
import { conflicts, type Booked } from "./booking";

type Executor = Client | Transaction;

/** Appointments that currently hold the calendar on a date (only paid ones do). */
export async function bookedOn(date: string, ex?: Executor): Promise<Booked[]> {
  if (!ex) {
    await initDb();
    ex = getDb();
  }
  const r = await ex.execute({
    sql: `SELECT event_time, duration_min FROM bookings WHERE event_date = ? AND status = 'paid'`,
    args: [date],
  });
  return r.rows.map((row) => ({ event_time: String(row.event_time), duration_min: Number(row.duration_min) }));
}

export async function slotTaken(date: string, startMin: number, durationMin: number, ex?: Executor): Promise<boolean> {
  return conflicts(startMin, durationMin, await bookedOn(date, ex));
}
