"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Opt = { slug: string; name: string; price: number; deposit: number };
type Slot = { time: string; label: string };

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0 })}`;

export default function BookingForm({
  service: selected,
  days,
  minDate,
  maxDate,
  canceled,
  depositPercent,
}: {
  service: Opt;
  days: { date: string; closed: boolean }[];
  minDate: string;
  maxDate: string;
  canceled: boolean;
  depositPercent: number;
}) {
  const service = selected.slug;
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [closed, setClosed] = useState(false);
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reqId = useRef(0);

  // Reload open times whenever the service or day changes.
  useEffect(() => {
    setTime("");
    setSlots(null);
    setClosed(false);
    if (!service || !date) return;
    const id = ++reqId.current;
    setLoading(true);
    setError("");
    fetch(`/api/availability?service=${encodeURIComponent(service)}&date=${date}`)
      .then(async (r) => {
        const j = await r.json();
        if (id !== reqId.current) return;
        if (!r.ok) throw new Error(j.error ?? "Could not load times");
        setSlots(j.slots);
        setClosed(Boolean(j.closed));
      })
      .catch((e: Error) => id === reqId.current && setError(e.message))
      .finally(() => id === reqId.current && setLoading(false));
  }, [service, date]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!date || !time) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: service,
          event_date: date,
          event_time: time,
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          notes: f.get("notes"),
          company: f.get("company"), // honeypot
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error ?? "Could not start checkout");
      window.location.assign(j.url);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="book-form" onSubmit={submit} noValidate={false}>
      {canceled && (
        <p className="book-alert" role="status">
          Checkout was canceled and you were not charged. Your time has not been held, so pick it again below.
        </p>
      )}

      <p className="book-deposit">
        <span>{depositPercent}% deposit today</span>
        <strong>{money(selected.deposit)}</strong>
        <em>Remaining {money(selected.price - selected.deposit)} is paid at the studio.</em>
      </p>

      <div className="book-step">
        <h3 className="step-title"><span>1</span> Pick a day</h3>
        <div className="daystrip" role="radiogroup" aria-label="Appointment day">
          {days.map((d) => {
            const dt = new Date(`${d.date}T12:00:00Z`);
            const f = (o: Intl.DateTimeFormatOptions) => dt.toLocaleDateString("en-US", { ...o, timeZone: "UTC" });
            return (
              <button
                key={d.date}
                type="button"
                role="radio"
                aria-checked={date === d.date}
                disabled={d.closed}
                className={date === d.date ? "day is-on" : "day"}
                onClick={() => setDate(d.date)}
                aria-label={`${f({ weekday: "long", month: "long", day: "numeric" })}${d.closed ? ", closed" : ""}`}
              >
                <small>{f({ weekday: "short" })}</small>
                <b>{f({ day: "numeric" })}</b>
                <small>{d.closed ? "Closed" : f({ month: "short" })}</small>
              </button>
            );
          })}
        </div>
        <details className="more-dates">
          <summary>Need a later date?</summary>
          <input aria-label="Appointment date" type="date" min={minDate} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)} />
        </details>
      </div>

      {date && (
        <div className="book-step">
          <h3 className="step-title"><span>2</span> Pick a time</h3>
          <div aria-live="polite" className="slot-area">
            {loading && <p className="book-hint">Checking the calendar…</p>}
            {!loading && slots && slots.length === 0 && (
              <p className="book-hint">
                {closed ? "The studio is closed that day. Please pick another day." : "No times are open that day for this service. Try another day."}
              </p>
            )}
            {!loading && slots && slots.length > 0 && (
              <div className="slots" role="radiogroup" aria-label="Available times, Central Time">
                {slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    role="radio"
                    aria-checked={time === s.time}
                    className={time === s.time ? "slot is-on" : "slot"}
                    onClick={() => setTime(s.time)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            {slots && slots.length > 0 && <p className="book-hint">Times are Central Time.</p>}
          </div>
        </div>
      )}

      {time && (
        <div className="book-step">
          <h3 className="step-title"><span>3</span> Your details</h3>
          <div className="book-grid">
            <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>
            <label>Email<input name="email" type="email" autoComplete="email" required maxLength={120} /></label>
            <label>Mobile phone<input name="phone" type="tel" autoComplete="tel" required minLength={10} maxLength={30} inputMode="tel" /></label>
            <label className="book-wide">
              Anything the studio should know? <span className="muted">(optional)</span>
              <textarea name="notes" rows={3} maxLength={400} />
            </label>
          </div>
          {/* Honeypot: real visitors never see or fill this. */}
          <div className="hp" aria-hidden="true">
            <label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
          </div>
        </div>
      )}

      {error && <p className="book-error" role="alert">{error}</p>}

      <div className="book-submit">
        <button type="submit" className="btn btn-primary" disabled={busy || !date || !time}>
          {busy ? "Opening checkout…" : `Pay ${money(selected.deposit)} deposit`}
        </button>
        <p className="book-hint">
          Secure card payment. By booking you agree to how we use your details in our{" "}
          <Link href="/privacy">privacy notice</Link>.
        </p>
      </div>
    </form>
  );
}
