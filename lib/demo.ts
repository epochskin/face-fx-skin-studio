import { dbConfigured } from "@/lib/db";
import { stripeConfigured } from "@/lib/stripe";

// True until Turso, Stripe, the webhook secret and the site URL are all set.
// In demo mode the whole booking flow is clickable, but nothing is charged, saved or emailed.
export const isDemo = () =>
  !(dbConfigured() && stripeConfigured() && process.env.STRIPE_WEBHOOK_SECRET && process.env.NEXT_PUBLIC_SITE_URL);
