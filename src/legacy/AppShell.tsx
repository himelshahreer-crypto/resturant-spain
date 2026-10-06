"use client";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/content/types";
import { localePrefix } from "@/i18n/config";
import type { DesignData } from "./design-data";
import { KebabApp, SCROLL_KEY, type View } from "./KebabApp";

const viewFromPath = (pathname: string): View => (/\/menu\/?$/.test(pathname) ? "menu" : "home");
const pathFor = (locale: Locale, view: View) => `${localePrefix(locale)}${view === "menu" ? "/menu/" : "/"}`;

/**
 * Mounts the ported design app once per locale layout, so its state (cart,
 * filters, slider position) survives navigation between / and /menu/,
 * just like the single-page design. The URL decides the view.
 */
export function AppShell({ locale, data }: { locale: Locale; data: DesignData }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <KebabApp
      data={data}
      view={viewFromPath(pathname)}
      locale={locale}
      navigate={(view) => router.push(pathFor(locale, view), { scroll: false })}
      // Locales use different root layouts, so switching is a full page load. The design switched
      // in place, so keep the visitor where they were: KebabApp restores this scroll position.
      switchLocale={(l, view) => {
        const target = pathFor(l, view);
        try {
          sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ path: target, y: scrollY }));
        } catch {}
        window.location.assign(target);
      }}
    />
  );
}
