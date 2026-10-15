import Stripe from "stripe";

// Lazy init. No apiVersion is pinned on purpose: the SDK uses the API version it
// was built against, so SDK upgrades and field names stay in step.
let _stripe: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}
