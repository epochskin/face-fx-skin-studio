# Face FX Skin Studio

Demo website for Face FX Skin Studio (New Orleans), built with Next.js (App Router) in the Epoch Skin design system:
cream `#FAF7F2`, sage `#A8B5A2`, metallic gold from the Epoch logo, black text, Lora headlines, Poppins body.

## Pages
`/` home, `/services` menu, `/services/[slug]` one page per service (8), `/about`, `/visit`.
Booking and checkout stay in Square: every **Book Now** button opens the studio's Square booking page.

## Run it
```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Settings you may want to change
- **Booking link**: `lib/site.ts` (`BOOKING_URL`), or set `NEXT_PUBLIC_BOOKING_URL`. Use the direct `book.squareup.com` link from
  Square Dashboard > Online Booking > Channels when you have it.
- **Services, prices, hours, contact**: `lib/services.ts` and `lib/site.ts`. These are the studio's details only.
- **Photos**: `public/images/`. They were cropped from Instagram screenshots, so swap in the originals for sharper results.

## This is a demo: hidden from Google
Search engines are blocked in three places: the `robots` metadata in `app/layout.tsx`, the `X-Robots-Tag` header in
`next.config.ts`, and `app/robots.ts`. When the client signs off, remove all three and add a sitemap.

## Footer credit
The footer carries a small "Designed by Epoch Skin" link to https://epoch-skin.com (`components/Footer.tsx`).
