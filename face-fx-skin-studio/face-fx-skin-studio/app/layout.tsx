import type { Metadata, Viewport } from "next";
import "@fontsource/lora/latin-400.css";
import "@fontsource/lora/latin-500.css";
import "@fontsource/lora/latin-600.css";
import "@fontsource/lora/latin-400-italic.css";
import "@fontsource/lora/latin-500-italic.css";
import "@fontsource/poppins/latin-300.css";
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "./epoch-tokens.css";
import "./site.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBar from "@/components/MobileBar";

// Absolute base for social image URLs. Set NEXT_PUBLIC_SITE_URL to the live domain.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Face FX Skin Studio | Corrective skincare in New Orleans", template: "%s | Face FX Skin Studio" },
  description:
    "HydraFacials, microneedling, sugaring and waxing in a calm studio on Louisiana Ave in New Orleans. Book online in a few taps.",
  openGraph: { siteName: "Face FX Skin Studio", type: "website" },
  twitter: { card: "summary_large_image" },
  // DEMO: hidden from Google and other search engines.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true, nosnippet: true },
  },
};

export const viewport: Viewport = {
  themeColor: "#F5D5D5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <MobileBar />
      </body>
    </html>
  );
}
