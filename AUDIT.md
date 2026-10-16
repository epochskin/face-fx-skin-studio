# Site audit: Face FX Skin Studio
Oct 14, 2026. Method: site-audit checklist plus site-security checklist, against the current copy of the app
(`face-fx-skin-studio/face-fx-skin-studio/` inside the repo). Verified with `tsc`, full `next build`
(native and default mode), `npm run test:booking` (19 tests) and a running production server.

## Fixed in this update
| # | Finding | Fix |
|---|---|---|
| 1 | Open Graph / Twitter image URLs resolved against `localhost:3000` (build warning: no `metadataBase`). Link previews would point nowhere. | `metadataBase` in `app/layout.tsx` from `NEXT_PUBLIC_SITE_URL` (or the Vercel production URL). Warning gone. |
| 2 | No security headers; only `X-Robots-Tag` was sent. | HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy added in `next.config.ts`. Confirmed in live responses. |
| 3 | No `.gitignore` anywhere in the repo. The repo is public, so one `.env.local` commit would leak keys. | `.gitignore` added (`.env*` ignored, `.env.example` kept), plus `.env.example` listing every variable. |
| 4 | No privacy page, but the booking flow stores name, email and phone. | `/privacy` added and linked from the footer and the booking form. Plain disclosure, not legal advice: have the studio read it. |
| 5 | Booking copy said "Confirm in Square" everywhere. | Copy follows the booking mode (home steps, About FAQ, service pages, services page). |

## Found while building, deviations from the booking-system reference code
| Issue in the reference | What this build does |
|---|---|
| `/api/calendar.ics` was public and lists every client's name, email and phone. | Needs `?token=CALENDAR_FEED_TOKEN`, constant-time compare, 404 otherwise. |
| Admin password passed as `?key=` (lands in logs and history). | Password POSTed once, httpOnly + sameSite=strict cookie holding an HMAC, 5 tries per 15 min. |
| Emails put customer text straight into HTML. | Escaped (`esc()` in `lib/email.ts`, tested). |
| `apiVersion: "2024-06-20"` pin. | Stripe SDK 23 no longer accepts it, and also removed `payment_method_types` (now `allowed_payment_method_types`). No pin; SDK default. |
| No protection against two people paying for the same time. | Overlap check inside the webhook transaction, automatic refund, emails to both sides, row marked `refunded` (or `conflict` if the refund fails, flagged red in admin). |

## Open: needs a decision or a check (not changed)
1. **Square link is unverified.** `https://face-fx-skin-studio.square.site/` in `lib/site.ts` is a default someone guessed. This
   session could not open it. In the default mode every Book Now depends on it. Open it, or paste the direct
   `book.squareup.com` link from Square Dashboard > Online Booking > Channels.
2. **Repo layout: resolved.** The app used to be in the repo twice, three folders deep. The current copy is now the repo root and the old
   one is deleted, so Vercel needs no Root Directory. If a Root Directory was already set in Vercel for the old layout, clear it.
3. **Business rules I had to choose** (all in `lib/booking.ts`): 50% deposit on every service (only Fall Reset documents a deposit
   today), 15 min buffer, 12 hour lead time, 90 day window, one appointment at a time, one service per online booking. Confirm with the studio.
4. **Emails can fail quietly.** If Resend rejects a message the booking is still saved and the error goes to the server log only. Watch
   `/admin/bookings` until the Resend domain is verified; consider a Vercel log alert.
5. **Hours are written twice.** `lib/site.ts` is the source (and drives booking), but the home page strip repeats them as prose
   ("Open Thursday through Monday, evenings until 8 pm, Sundays 10 to 2"). Update both if hours change.
6. **Demo hiding.** The site is noindex in three places (layout, `X-Robots-Tag`, `robots.ts`) on purpose. At launch remove all three,
   add a sitemap and LocalBusiness structured data. The HSTS `preload` flag should only stay once the live domain is final.
7. **Map embed** uses Google's unofficial `maps?q=...&output=embed` URL. It works today but is not a supported API.
8. **Photos removed on purpose.** They were low-resolution Instagram crops, one showed another spa's signage ("Spa at the Battle House"),
   and the hero was a photo of a person. All slots now show placeholders; see `lib/photos.ts`. Get original files from the studio.
9. **Logo looks like a draft.** `public/images/logo.png` (and the social share image built from it) has faint repeating "fiverr" preview
   watermarks. Ask the studio for the paid, unwatermarked logo files and replace `logo.png`, `app/icon.png` and the two share images.
10. No CSP header is set.

## Re-check after the Square-style menu and demo mode (Oct 15)
- Build passes, typecheck clean, 19 booking tests pass, `npm audit --omit=dev`: 0 vulnerabilities.
- Demo mode (`lib/demo.ts`) is on only while Stripe, Turso, the webhook secret or the site URL is missing. It never calls Stripe or the database, sends no email, and its success page only echoes values that pass the same date/time/service validation. Rate limiting is skipped in demo because it needs the database.
- Open 11: the demo success page shows the email typed into the query string; harmless, but it disappears once real keys are set.
- Open 12: Square menu text in `lib/services.ts` (SQUARE_MENU) was copied from the studio's PDF capture, not re-checked against the live Square page.
