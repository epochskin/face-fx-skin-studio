// Single source of truth for the studio's public details.
// Only the studio's own contact info lives here. Nothing personal to the site's designer.

// Square booking page. Swap this for the direct book.squareup.com link
// (Square Dashboard > Online Booking > Channels) or set NEXT_PUBLIC_BOOKING_URL.
export const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL ?? "https://face-fx-skin-studio.square.site/";

// Booking mode. Default is the on-site flow (/book -> Stripe deposit -> confirmation email).
// Set NEXT_PUBLIC_BOOKING_MODE=square to send every Book Now to the studio's Square page instead.
export const IS_NATIVE = process.env.NEXT_PUBLIC_BOOKING_MODE !== "square";

export const SITE = {
  name: "Face FX Skin Studio",
  tagline: "Corrective skincare in New Orleans",
  phoneDisplay: "(504) 872-4953",
  phoneTel: "+15048724953",
  email: "nieceo@facefxskinsolutions.co",
  instagramUrl: "https://instagram.com/facefx_skinstudio",
  instagramHandle: "@facefx_skinstudio",
  street: "2426 Louisiana Ave",
  cityLine: "New Orleans, LA",
  locatedInside: "Nola Colonics",
} as const;

export const MAPS_QUERY = encodeURIComponent("2426 Louisiana Ave, New Orleans, LA");
export const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`;
export const MAP_EMBED_URL = `https://www.google.com/maps?q=${MAPS_QUERY}&output=embed`;

export const HOURS = [
  { day: "Monday", hours: "8:00 am – 8:00 pm" },
  { day: "Tuesday", hours: "Closed" },
  { day: "Wednesday", hours: "Closed" },
  { day: "Thursday", hours: "8:00 am – 8:00 pm" },
  { day: "Friday", hours: "8:00 am – 8:00 pm" },
  { day: "Saturday", hours: "8:00 am – 8:00 pm" },
  { day: "Sunday", hours: "10:00 am – 2:00 pm" },
] as const;

export const NAV = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/visit", label: "Visit" },
] as const;
