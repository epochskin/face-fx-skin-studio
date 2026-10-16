"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BookLink from "./BookLink";
import { NAV, SITE } from "@/lib/site";

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="site-header">
      <div className="wrap header-row">
        <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
          <Image src="/images/logo.png" alt="" width={48} height={48} priority />
          <span className="brand-name">Face FX <span>Skin Studio</span></span>
        </Link>

        <nav className="nav-desktop" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={pathname.startsWith(n.href) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
          <BookLink className="btn btn-secondary btn-sm" />
        </nav>

        <button
          type="button"
          className="menu-btn"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
            {open ? <path d="M5 5l16 16M21 5L5 21" /> : <path d="M3 8h20M3 13h20M3 18h20" />}
          </svg>
        </button>
      </div>

      <nav id="mobile-menu" className="nav-mobile" hidden={!open} aria-label="Mobile">
        <Link href="/">Home</Link>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}>{n.label}</Link>
        ))}
        <a href={`tel:${SITE.phoneTel}`}>Call {SITE.phoneDisplay}</a>
      </nav>
    </header>
  );
}
