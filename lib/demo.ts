import { dbConfigured } from "@/lib/db";
import { IS_SQUARE_API } from "@/lib/site";
import { squareConfigured } from "@/lib/square";
import { stripeConfigured } from "@/lib/stripe";

// native mode: true until Turso, Stripe, the webhook secret and the site URL are all set.
// square-api mode: true until SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID are set.
// In demo mode the whole booking flow is clickable, but nothing is charged, saved or emailed.
export const isDemo = () =>
  IS_SQUARE_API ? !squareConfigured() : !(dbConfigured() && stripeConfigured() && process.env.STRIPE_WEBHOOK_SECRET && process.env.NEXT_PUBLIC_SITE_URL);
