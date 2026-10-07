import type { ReactNode } from "react";
import { SiteDocument } from "../site-document";

export default function SpanishRootLayout({ children }: { children: ReactNode }) {
  return <SiteDocument locale="es">{children}</SiteDocument>;
}
