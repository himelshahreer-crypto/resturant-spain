import type { ReactNode } from "react";
import type { Locale } from "@/content/types";
import { AppShell } from "@/legacy/AppShell";
import { toDesignData } from "@/legacy/design-data";
import { getMenuRepository } from "@/lib/menu/repository";

/**
 * The design's CSS is served as-is from public/styles, not through the Next.js CSS pipeline:
 * its minifier rewrites declarations (e.g. it dropped `backdrop-filter` and kept only
 * `-webkit-backdrop-filter`, which Chrome ignores). Order matters: same as the design.
 */
const STYLESHEETS = ["/styles/fonts.css", "/styles/runtime-parity.css", "/styles/design.css", "/styles/pseudo.css"];

/**
 * The <html>/<body> shell shared by every root layout (one per locale group).
 * The whole UI lives in <AppShell> (the faithful port); pages only select the URL.
 */
export async function SiteDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
  // Content is loaded through the MenuRepository seam at build time (static export).
  const data = toDesignData(await getMenuRepository().load());
  return (
    <html lang={locale}>
      <head>
        <link rel="preload" as="font" type="font/woff2" href="/fonts/inter-latin.woff2" crossOrigin="anonymous" />
        {STYLESHEETS.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body>
        {/* Same wrapper depth as the design runtime (#dc-root > .sc-host), see runtime-parity.css */}
        <div id="kf-root">
          <div className="kf-host">
            <AppShell locale={locale} data={data} />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
