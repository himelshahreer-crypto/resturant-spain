import type {
  AllergenCode,
  Category,
  FaqEntry,
  GalleryEntry,
  HeroSlide,
  JourneyStop,
  Localized,
  MenuItem,
  PopularEntry,
  Review,
  TimelineEntry,
} from "@/content/types";

/** Everything the site shows that the owner will eventually edit in the admin panel. */
export interface MenuData {
  categories: Category[];
  items: MenuItem[];
  allergens: Record<AllergenCode, Localized>;
  home: {
    slides: HeroSlide[];
    popular: PopularEntry[];
    reviews: Review[];
    journey: JourneyStop[];
    timeline: TimelineEntry[];
    gallery: GalleryEntry[];
    faq: FaqEntry[];
  };
}

/**
 * Seam for the future backend (Phase 7). Pages load content only through this;
 * swapping in a database/CMS-backed implementation needs no UI changes.
 * It runs at build time (static export), or on the server once there is one.
 */
export interface MenuRepository {
  load(): Promise<MenuData>;
}

/** Reads the typed content files in src/content (extracted from the design). */
export class StaticMenuRepository implements MenuRepository {
  async load(): Promise<MenuData> {
    const [menu, home] = await Promise.all([import("@/content/menu"), import("@/content/home")]);
    return {
      categories: menu.categories,
      items: menu.items,
      allergens: menu.allergens,
      home: {
        slides: home.slides,
        popular: home.popular,
        reviews: home.reviews,
        journey: home.journey,
        timeline: home.timeline,
        gallery: home.gallery,
        faq: home.faq,
      },
    };
  }
}

export function getMenuRepository(): MenuRepository {
  return new StaticMenuRepository();
}
