import { createClient, type Client } from "@libsql/client";

// Lazy init: never create a client at module top level, or the build crashes
// on hosts where env vars are not present at build time.
let _db: Client | null = null;
let _ready: Promise<void> | null = null;

export function dbConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

export function getDb(): Client {
  if (_db) return _db;
  _db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return _db;
}

// Idempotent schema setup, run once per server instance.
export function initDb(): Promise<void> {
  if (_ready) return _ready;
  _ready = (async () => {
    const db = getDb();
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        service_slug TEXT NOT NULL,
        service_name TEXT NOT NULL,
        event_date TEXT NOT NULL,          -- studio-local date, yyyy-mm-dd
        event_time TEXT NOT NULL,          -- studio-local start, 24h HH:MM
        duration_min INTEGER NOT NULL,
        price_cents INTEGER NOT NULL,      -- full service price
        deposit_cents INTEGER NOT NULL,    -- charged online
        notes TEXT,
        stripe_session_id TEXT,
        payment_intent TEXT,
        status TEXT NOT NULL DEFAULT 'paid', -- paid | refunded | conflict | cancelled
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    // One booking per Stripe session: this is what makes the webhook idempotent.
    await db.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_stripe_session ON bookings(stripe_session_id)`,
    );
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(event_date)`);
    await db.execute(
      `CREATE TABLE IF NOT EXISTS rate_limits (k TEXT NOT NULL, w INTEGER NOT NULL, c INTEGER NOT NULL, PRIMARY KEY (k, w))`,
    );
  })().catch((err) => {
    _ready = null; // allow a retry on the next request
    throw err;
  });
  return _ready;
}
