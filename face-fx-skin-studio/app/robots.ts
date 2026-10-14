import type { MetadataRoute } from "next";

// DEMO: ask every crawler to stay out. No sitemap is published on purpose.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
