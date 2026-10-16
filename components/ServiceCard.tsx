import Link from "next/link";
import { money, type Service } from "@/lib/services";

export default function ServiceCard({ s }: { s: Service }) {
  return (
    <article className="card service-card">
      <h3>
        <Link href={`/services/${s.slug}`}>{s.name}</Link>
      </h3>
      <p className="service-meta">
        <span className="price">{money(s.price)}</span>
        <span className="dur">{s.duration}</span>
      </p>
      <p className="service-sum">{s.summary}</p>
      <Link href={`/services/${s.slug}`} className="text-link">
        See details<span className="sr-only"> for {s.name}</span>
      </Link>
    </article>
  );
}
