import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DEMO: keep every response out of search engines until the studio signs off.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
