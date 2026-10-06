import type { Metadata } from "next";
import type { Locale } from "@/content/types";
import type { MenuData } from "@/lib/menu/repository";
import { LOCALES, localePrefix } from "@/i18n/config";

/**
 * Absolute site URL, required for canonical/hreflang/Open Graph/sitemap. Set SITE_URL when
 * building for production, e.g. SITE_URL=https://www.example.com pnpm build
 */
export const SITE_URL = (process.env.SITE_URL || "https://kebabfactory.example").replace(/\/$/, "");
if (!process.env.SITE_URL && process.env.NODE_ENV === "production") {
  console.warn(`[seo] SITE_URL is not set; using the placeholder ${SITE_URL}. Set it before deploying.`);
}

export type View = "home" | "menu";

const path = (locale: Locale, view: View) => `${localePrefix(locale)}${view === "menu" ? "/menu/" : "/"}`;
export const absoluteUrl = (locale: Locale, view: View) => `${SITE_URL}${path(locale, view)}`;

// The design's <title>/description were English only; these are the per-language versions.
const TEXT: Record<Locale, Record<View, { title: string; description: string }>> = {
  es: {
    home: {
      title: "Kebab Factory · Dürüms, pizzas y burgers en Badalona",
      description:
        "Pide dürüms, pizzas, burgers y tacos fritos directamente a Kebab Factory en Badalona. Entrega en unos 45 minutos; paga en efectivo o con tarjeta al recibir.",
    },
    menu: {
      title: "Menú · Kebab Factory Badalona",
      description:
        "Dürüms, pizzas, hamburguesas, tacos fritos, bebidas y menús combo. Hecho al momento y entregado en unos 45 minutos en Badalona.",
    },
  },
  ca: {
    home: {
      title: "Kebab Factory · Dürüms, pizzes i burgers a Badalona",
      description:
        "Demana dürüms, pizzes, burgers i tacos fregits directament a Kebab Factory a Badalona. Lliurament en uns 45 minuts; paga en efectiu o amb targeta en rebre-ho.",
    },
    menu: {
      title: "Menú · Kebab Factory Badalona",
      description:
        "Dürüms, pizzes, hamburgueses, tacos fregits, begudes i menús combo. Fet al moment i lliurat en uns 45 minuts a Badalona.",
    },
  },
  en: {
    home: {
      title: "Kebab Factory · Dürüms, pizza & burgers in Badalona",
      description:
        "Order dürüms, pizza, burgers and fried tacos straight from Kebab Factory in Badalona. Delivered in about 45 minutes, pay cash or card at the door.",
    },
    menu: {
      title: "Menu · Kebab Factory Badalona",
      description:
        "Dürüms, pizzas, burgers, fried tacos, drinks and combo menus. Made to order and delivered in about 45 minutes in Badalona.",
    },
  },
};

const OG_LOCALE: Record<Locale, string> = { es: "es_ES", ca: "ca_ES", en: "en_GB" };

export function pageMetadata(locale: Locale, view: View): Metadata {
  const { title, description } = TEXT[locale][view];
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: path(locale, view),
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [l, path(l, view)])),
        "x-default": path("es", view),
      },
    },
    openGraph: {
      type: "website",
      siteName: "Kebab Factory",
      title,
      description,
      url: path(locale, view),
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Kebab Factory" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.jpg"] },
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icon-32.png", sizes: "32x32" },
      ],
      apple: "/apple-icon.png",
    },
    manifest: "/manifest.webmanifest",
  };
}

// ---------- structured data (JSON-LD) ----------

const RESTAURANT_ID = `${SITE_URL}/#restaurant`;

/** Opening hours as shown in the design ("Find us"): Sun–Thu 12:30–23:30, Fri–Sat 12:30–00:00. */
const HOURS = [
  { dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"], opens: "12:30", closes: "23:30" },
  { dayOfWeek: ["Friday", "Saturday"], opens: "12:30", closes: "00:00" },
];

export function restaurantJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": RESTAURANT_ID,
    name: "Kebab Factory",
    url: absoluteUrl(locale, "home"),
    image: `${SITE_URL}/og.jpg`,
    description: TEXT[locale].home.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Badalona",
      addressRegion: "Barcelona",
      addressCountry: "ES",
    },
    servesCuisine: ["Kebab", "Pizza", "Burgers", "Tacos"],
    priceRange: "€",
    acceptsReservations: false,
    paymentAccepted: "Cash, Credit Card",
    openingHoursSpecification: HOURS.map((h) => ({ "@type": "OpeningHoursSpecification", ...h })),
    hasMenu: absoluteUrl(locale, "menu"),
  };
}

export function menuJsonLd(locale: Locale, data: MenuData) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${absoluteUrl(locale, "menu")}#menu`,
    name: TEXT[locale].menu.title,
    inLanguage: locale,
    url: absoluteUrl(locale, "menu"),
    hasMenuSection: data.categories.map((c) => ({
      "@type": "MenuSection",
      name: c.name[locale],
      hasMenuItem: data.items
        .filter((i) => i.categoryId === c.id && i.available)
        .map((i) => ({
          "@type": "MenuItem",
          name: i.name[locale],
          description: i.description[locale],
          image: `${SITE_URL}/assets/food/${i.image}`,
          offers: { "@type": "Offer", price: (i.priceCents / 100).toFixed(2), priceCurrency: "EUR" },
          ...(i.halal ? { suitableForDiet: "https://schema.org/HalalDiet" } : {}),
        })),
    })),
  };
}

export function faqJsonLd(locale: Locale, data: MenuData) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: data.home.faq.map((f) => ({
      "@type": "Question",
      name: f.question[locale],
      acceptedAnswer: { "@type": "Answer", text: f.answer[locale] },
    })),
  };
}
