import type { ReactNode } from "react";
import type { Locale } from "@/content/types";
import "@/styles/globals.css";

/** The <html>/<body> shell shared by every root layout (one per locale group). */
export function SiteDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html lang={locale}>
      <head>
        <link rel="preload" as="font" type="font/woff2" href="/fonts/inter-latin.woff2" crossOrigin="anonymous" />
      </head>
      <body>
        {/* Same wrapper depth as the design runtime (#dc-root > .sc-host), see runtime-parity.css */}
        <div id="kf-root">
          <div className="kf-host">{children}</div>
        </div>
      </body>
    </html>
  );
}
