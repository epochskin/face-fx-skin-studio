import Link from "next/link";
import { BOOKING_URL, IS_NATIVE } from "@/lib/site";

// Every Book Now on the site goes through here.
// native mode: the on-site booking flow (/book). square mode: the studio's Square page.
export default function BookLink({
  className = "btn btn-primary",
  children = "Book Now",
  service,
}: {
  className?: string;
  children?: React.ReactNode;
  service?: string; // service slug to preselect in native mode
}) {
  if (IS_NATIVE) {
    return (
      <Link href={service ? `/book?service=${encodeURIComponent(service)}` : "/services"} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (opens the Square booking page in a new tab)</span>
    </a>
  );
}
