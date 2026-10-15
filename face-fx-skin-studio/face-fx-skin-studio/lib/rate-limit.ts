import { getDb, initDb } from "./db";

// Fixed-window limiter backed by the site's Turso DB (in-memory limiters do not
// survive serverless). Returns true when the request is allowed.
export async function rateLimit(key: string, limit: number, windowSecs: number): Promise<boolean> {
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
