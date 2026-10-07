import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n/config";
import { absoluteUrl, type View } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const views: View[] = ["home", "menu"];
  return views.flatMap((view) =>
    LOCALES.map((locale) => ({
      url: absoluteUrl(locale, view),
      changeFrequency: "weekly" as const,
      priority: view === "home" ? 1 : 0.9,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(l, view)])) },
    })),
  );
}
