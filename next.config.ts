import type { NextConfig } from "next";

// Static export: `pnpm build` writes a plain `out/` folder that any web
// server can host (Apache, Nginx, cPanel, Node). See docs/NEXTJS_MIGRATION_PLAN.md §5.1.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true, // /menu -> /menu/index.html, works on every static host
  images: { unoptimized: true }, // no runtime optimiser in a static export; variants are generated at build (Phase 4)
  reactStrictMode: true,
};

export default nextConfig;
