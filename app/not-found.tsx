import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="wrap narrow center">
        <p className="eyebrow">Page not found</p>
        <h1>We couldn&apos;t find that page</h1>
        <p className="lead">It may have moved. Head back to the menu or home page.</p>
        <p className="actions center-actions">
          <Link href="/services" className="btn btn-outline">View services</Link>
          <Link href="/" className="btn btn-outline">Go home</Link>
        </p>
      </div>
    </section>
  );
}
