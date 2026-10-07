import type { IconName } from "@/components/icon/Icon";

/** Text in every supported language. Catalan falls back to Spanish in the design data. */
export type Localized = { es: string; ca: string; en: string };
export type Locale = keyof Localized;

export type AllergenCode = "gluten" | "dairy" | "egg" | "sesame" | "soy" | "mustard" | "nuts" | "sulphites" | "celery";

export interface Category {
  id: string;
  name: Localized;
  icon: IconName;
  isNew?: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: Localized;
  description: Localized;
  /** Integer cents (the design stores euros as floats). */
  priceCents: number;
  /** File name in /assets/food/. */
  image: string;
  /** CSS background-position used to frame the photo. */
  imagePosition: string;
  badge?: Localized;
  allergens: AllergenCode[];
  halal?: boolean;
  /** Sold-out switch, for the future admin panel. Everything is available in the design. */
  available: boolean;
}

export interface HeroSlide {
  image: string;
  imagePosition: string;
  itemId: string;
}
export interface PopularEntry {
  itemId: string;
  features: Localized[];
}
export interface Review {
  name: string;
  stars: number;
  text: string;
  itemId: string;
  photo: string;
}
export interface JourneyStop {
  x: number;
  y: number;
  side: "l" | "r" | "c";
  icon: IconName;
  image: string;
  timelineIndex: number;
}
export interface TimelineEntry {
  year: Localized;
  title: Localized;
  text: Localized;
  icon: IconName;
}
export interface GalleryEntry {
  image: string;
  itemId?: string;
  name?: Localized;
}
export interface FaqEntry {
  question: Localized;
  answer: Localized;
}
