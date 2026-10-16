"use client";

import { useEffect, useState } from "react";
import { HOURS } from "@/lib/site";

// Highlights today's row using the studio's local time (New Orleans, Central).
export default function HoursTable() {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "America/Chicago" }).format(new Date()));
  }, []);

  return (
    <table className="hours">
      <caption className="sr-only">Opening hours</caption>
      <tbody>
        {HOURS.map((h) => (
          <tr key={h.day} className={today === h.day ? "is-today" : undefined}>
            <th scope="row">{h.day}</th>
            <td className={h.hours === "Closed" ? "closed" : undefined}>{h.hours}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
