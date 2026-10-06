// The four page bodies. The UI itself is rendered by <AppShell> in the root layout (the
// faithful port of the single-page design); a page selects the URL and adds its metadata
// and structured data.
import { preload } from "react-dom";
import type { Locale } from "@/content/types";
import { JsonLd } from "@/components/JsonLd";
import { getMenuRepository } from "@/lib/menu/repository";
import { faqJsonLd, menuJsonLd, restaurantJsonLd } from "@/lib/seo";

export async function HomePage({ locale }: { locale: Locale }) {
  const data = await getMenuRepository().load();
  // The design preloaded the first hero image in its <head>; it's the page's largest paint.
  preload(`/assets/food/${data.home.slides[0].image}`, { as: "image", fetchPriority: "high" });
  return (
    <>
      <JsonLd data={restaurantJsonLd(locale)} />
      <JsonLd data={faqJsonLd(locale, data)} />
    </>
  );
}

export async function MenuPage({ locale }: { locale: Locale }) {
  const data = await getMenuRepository().load();
  return (
    <>
      <JsonLd data={restaurantJsonLd(locale)} />
      <JsonLd data={menuJsonLd(locale, data)} />
    </>
  );
}
