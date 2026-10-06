import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PREFIXED_LOCALES, isLocale } from "@/i18n/config";
import { SiteDocument } from "../../site-document";
import { siteMetadata } from "../../metadata";

export const metadata = siteMetadata;
export const dynamicParams = false;

export function generateStaticParams() {
  return PREFIXED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleRootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <SiteDocument locale={locale}>{children}</SiteDocument>;
}
