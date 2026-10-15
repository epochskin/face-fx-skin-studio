import { SITE } from "@/lib/site";
import BookLink from "./BookLink";

// Phone-only sticky action bar: text, call, and Book Now are always one tap away.
export default function MobileBar() {
  return (
    <div className="mobile-bar" role="region" aria-label="Quick actions">
      <a href={`sms:${SITE.phoneTel}`} className="icon-btn" aria-label="Text the studio">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M4 5h16v11H9l-5 4V5z" strokeLinejoin="round" />
        </svg>
      </a>
      <a href={`tel:${SITE.phoneTel}`} className="icon-btn" aria-label="Call the studio">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 005 5L15.5 12.5l4 1.5v3a2 2 0 01-2 2A14 14 0 014.5 6a2 2 0 012-2z" strokeLinejoin="round" />
        </svg>
      </a>
      <BookLink className="btn btn-primary bar-book" />
    </div>
  );
}
