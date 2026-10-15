import { BOOKING_URL } from "@/lib/site";

// Every Book Now on the site goes to the Square booking page. Checkout stays in Square.
export default function BookLink({
  className = "btn btn-primary",
  children = "Book Now",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (opens the Square booking page in a new tab)</span>
    </a>
  );
}
