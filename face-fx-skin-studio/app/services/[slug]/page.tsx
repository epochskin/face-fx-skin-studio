import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookLink from "@/components/BookLink";
import ServiceCard from "@/components/ServiceCard";
import { SERVICES, bySlug, money } from "@/lib/services";
import { SITE } from "@/lib/site";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const s = bySlug(slug);
  return s ? { title: s.name, description: s.summary } : {};
}

export default async function ServicePage({ params }: { params: Params }) {
  const { slug } = await params;
  const s = bySlug(slug);
  if (!s) notFound();

  const more = SERVICES.filter((x) => x.slug !== s.slug && x.category === s.category).slice(0, 3);
  const others = more.length >= 3 ? more : [...more, ...SERVICES.filter((x) => x.slug !== s.slug && !more.includes(x))].slice(0, 3);

  return (
    <>
      <section className="page-head">
        <div className="wrap narrow">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/services">All services</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{s.name}</span>
          </nav>
          <h1>{s.name}</h1>
          <p className="facts">
            <span><strong>{money(s.price)}</strong> price</span>
            <span><strong>{s.duration}</strong> appointment</span>
          </p>
        </div>
      </section>

      <section className="section service-body">
        <div className="wrap narrow">
          <p className="lead">{s.description}</p>

          {s.includes && (
            <>
              <h2 className="h3">What&apos;s included</h2>
              <ul className="checks">
                {s.includes.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </>
          )}

          <p className="note">
            {s.note ?? "Any deposit is shown at checkout before you confirm."} Booking and payment happen securely in
            Square.
          </p>

          <p className="actions">
            <BookLink>Book {s.name}</BookLink>
            <a href={`sms:${SITE.phoneTel}`} className="btn btn-outline">Ask a question</a>
          </p>
        </div>
      </section>

      <section className="section band-cream-deep">
        <div className="wrap">
          <h2>You may also like</h2>
          <div className="grid grid-3">
            {others.map((o) => (
              <ServiceCard key={o.slug} s={o} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
