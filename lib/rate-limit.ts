import { dbConfigured, getDb, initDb } from "./db";

// No database (square-api mode): per-instance counters. Best effort on serverless, but it still blunts spam.
const mem = new Map<string, { w: number; c: number }>();
function memoryLimit(key: string, limit: number, windowSecs: number): boolean {
  const w = Math.floor(Math.floor(Date.now() / 1000) / windowSecs);
  const e = mem.get(key);
  const c = e && e.w === w ? e.c + 1 : 1;
  mem.set(key, { w, c });
  if (mem.size > 5000) for (const [k, v] of mem) if (v.w < w) mem.delete(k);
  return c <= limit;
}

// Fixed-window limiter backed by the site's Turso DB (in-memory limiters do not
// survive serverless). Returns true when the request is allowed.
export async function rateLimit(key: string, limit: number, windowSecs: number): Promise<boolean> {
  if (!dbConfigured()) return memoryLimit(key, limit, windowSecs);
  await initDb();
  const db = getDb();
  const nowSecs = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSecs / windowSecs) * windowSecs;
  const r = await db.execute({
    sql: `INSERT INTO rate_limits (k, w, c) VALUES (?, ?, 1)
          ON CONFLICT(k, w) DO UPDATE SET c = c + 1 RETURNING c`,
    args: [key, windowStart],
  });
  // Keep the table small: drop windows older than a day, roughly 1 request in 50.
  if (Math.random() < 0.02) {
    await db.execute({ sql: `DELETE FROM rate_limits WHERE w < ?`, args: [nowSecs - 86400] });
  }
  return Number(r.rows[0].c) <= limit;
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim() || "unknown";
}
