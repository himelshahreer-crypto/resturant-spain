"use client";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/content/types";
import { localePrefix } from "@/i18n/config";
import { KebabApp, type View } from "./KebabApp";

const viewFromPath = (pathname: string): View => (/\/menu\/?$/.test(pathname) ? "menu" : "home");
const pathFor = (locale: Locale, view: View) => `${localePrefix(locale)}${view === "menu" ? "/menu/" : "/"}`;

/**
 * Mounts the ported design app once per locale layout, so its state (cart,
 * filters, slider position) survives navigation between / and /menu/,
 * just like the single-page design. The URL decides the view.
 */
export function AppShell({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <KebabApp
      view={viewFromPath(pathname)}
      locale={locale}
      navigate={(view) => router.push(pathFor(locale, view), { scroll: false })}
      // Locales use different root layouts, so switching is a full page load (Phase 3 restores scroll).
      switchLocale={(l, view) => window.location.assign(pathFor(l, view))}
    />
  );
}
