# Face FX Skin Studio

Demo website for Face FX Skin Studio (New Orleans), built with Next.js (App Router) in the Epoch Skin design system:
cream `#FAF7F2`, sage `#A8B5A2`, metallic gold from the Epoch logo, black text, Lora headlines, Poppins body.

## Pages
`/` home, `/services` menu, `/services/[slug]` one page per service (8), `/about`, `/visit`, `/privacy`,
and the booking flow: `/book`, `/booking/success`, `/admin/bookings`.

## Three booking modes
Set by one variable, `NEXT_PUBLIC_BOOKING_MODE` (rebuild after changing it):

- **`native` (default):** the on-site flow. Client picks a service, day and time on `/book`, pays a **50% deposit** on Stripe Checkout,
  and the Stripe webhook saves the booking, emails the client and the owner with a calendar invite, and updates the owner's
  calendar feed. Needs the setup below. Until the keys are set, `/book` shows a "being set up" message with call and text options.
- **`square`:** every **Book Now** opens the studio's Square booking page. Nothing else is needed.
- **`square-api`:** the same on-site flow (`/book`), but open times come from the studio's Square calendar and the booking is created
  in Square. No card is taken on this site. See "Square API setup" below.

```
/book  ->  POST /api/checkout  ->  Stripe Checkout (hosted)
       ->  POST /api/stripe/webhook (checkout.session.completed)
       ->  save row in Turso  ->  Resend emails + .ics  ->  /booking/success
Owner: /admin/bookings  and  /api/calendar.ics?token=...
```

A booking only exists once Stripe confirms payment. Times already taken are hidden, and if two people pay for the same time
at once the second is refunded automatically and both sides are emailed.

### Native mode setup
1. **Turso:** create one database for this site only (`face-fx-bookings`). Copy `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
2. **Stripe:** copy `STRIPE_SECRET_KEY`. After the first deploy add a webhook endpoint
   `https://<domain>/api/stripe/webhook` for the event `checkout.session.completed` and copy its `STRIPE_WEBHOOK_SECRET`.
3. **Resend:** copy `RESEND_API_KEY`. Keep `RESEND_FROM_EMAIL=onboarding@resend.dev` until the studio's domain is verified,
   and set `RESEND_TO_EMAIL` to the owner.
4. Also set `NEXT_PUBLIC_SITE_URL`, `ADMIN_PASSWORD` and `CALENDAR_FEED_TOKEN` (a long random string). See `.env.example` for every variable. Env changes need a redeploy.
5. **Calendar:** sign in at `/admin/bookings`, copy the calendar feed link, then subscribe once
   (Mac: Calendar > File > New Calendar Subscription. iPhone: Settings > Calendar > Accounts > Add Subscribed Calendar).

### Booking rules (edit in `lib/booking.ts`, confirm with the studio)
Deposit 50% of the price, start times every 30 minutes, 15 minute buffer between appointments, bookable from 12 hours ahead
up to 90 days out, one appointment at a time. Opening hours come from `HOURS` in `lib/site.ts`, so there is one place to edit them.
Prices and durations come from `lib/services.ts`; the browser never sends an amount.

### Square API setup
Set `NEXT_PUBLIC_BOOKING_MODE=square-api`, `NEXT_PUBLIC_SITE_URL`, `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID` and
`SQUARE_ENVIRONMENT` (`sandbox` while testing, `production` to go live), then redeploy.

1. **Requirement:** Square only lets the Bookings API create bookings for a seller on **Appointments Plus or Premium**.
2. **Token:** Square Developer Dashboard > create an app > Credentials. Use the Sandbox token first, then the Production one with
   `SQUARE_ENVIRONMENT=production`. Production needs the studio owner's Square login (or an OAuth grant from her).
3. **Services:** each site service is matched to the Square appointment service **by name** (`lib/services.ts` names were copied
   from Square). Run `npm run square:check` (with the vars in `.env.local`) to see what matched and what did not.
4. **Times:** Square decides what is open (its hours, staff, buffers, lead time). The site only hides closed days using `HOURS`.
5. **Payment:** the site creates the appointment only. It does not take a card or a deposit. Square's card-on-file rule applies on
   Square's own booking page, not to bookings created through the API.
6. **Emails:** the site sends none in this mode. Confirmations and reminders come from Square's own settings.
   Check this in the sandbox/with a test booking before launch.

### Square later (native mode)
Booking is behind a few small files, so adding the Square API means swapping those rather than rewriting the site: `lib/booking.ts`
(rules), `app/api/availability` and `app/api/checkout` (what the form calls), and `app/api/stripe/webhook` (what saves a booking).
The `square-api` mode above is that swap, done without touching the native files.

### Tests
`npm run test:booking` runs the rules and every API route against a throwaway local database. Stripe and Resend are stubbed.

## Run it
```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Settings you may want to change
- **Square booking link** (square mode): `lib/site.ts` (`BOOKING_URL`), or set `NEXT_PUBLIC_BOOKING_URL`. Use the direct
  `book.squareup.com` link from Square Dashboard > Online Booking > Channels when you have it.
- **Services, prices, hours, contact**: `lib/services.ts` and `lib/site.ts`. These are the studio's details only.
- **Photos**: all photo slots live in `lib/photos.ts`. They show themed "Photo coming soon" placeholders until a file is set.
  To add one, drop the studio's original file in `public/images/` and set its `src`, `width` and `height` in `lib/photos.ts`
  (aim for 1600 px or more on the long edge; the earlier ones were Instagram screenshots and looked soft). Logos stay in `public/images/`.

## This is a demo: hidden from Google
Search engines are blocked in three places: the `robots` metadata in `app/layout.tsx`, the `X-Robots-Tag` header in
`next.config.ts`, and `app/robots.ts`. When the client signs off, remove all three and add a sitemap.

## Footer credit
The footer carries a small "Designed by Epoch Skin" link to https://epoch-skin.com (`components/Footer.tsx`).
