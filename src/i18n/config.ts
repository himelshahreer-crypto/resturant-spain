import type { Locale } from "@/content/types";

export const LOCALES = ["es", "ca", "en"] as const satisfies readonly Locale[];
export const DEFAULT_LOCALE: Locale = "es";
/** Locales served under a path prefix (/ca, /en). Spanish lives at the root. */
export const PREFIXED_LOCALES = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** URL prefix for a locale: "" for Spanish, "/ca" or "/en" otherwise. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}
