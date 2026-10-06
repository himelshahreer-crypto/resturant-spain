import type { ReactNode } from "react";
import { SiteDocument } from "../site-document";
import { siteMetadata } from "../metadata";

export const metadata = siteMetadata;

export default function SpanishRootLayout({ children }: { children: ReactNode }) {
  return <SiteDocument locale="es">{children}</SiteDocument>;
}
