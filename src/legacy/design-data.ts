// Maps the site's content (MenuData from the MenuRepository) back to the exact shapes the
// design's Component class used (CATS, ITEMS, SLIDES, …), so the faithful port of its logic
// (KebabApp.tsx) can stay line-for-line. A unit test proves the result equals the design's
// own data. Removed in Phase 6.
import type { MenuData } from "@/lib/menu/repository";

export function toDesignData({ categories, items, allergens, home }: MenuData) {
  const { slides, popular, reviews, journey, timeline, gallery, faq } = home;
  return {
    CATS: categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, ...(c.isNew ? { isNew: true } : {}) })),
    ITEMS: items.map((i) => ({
      id: i.id,
      cat: i.categoryId,
      name: i.name,
      desc: i.description,
      price: i.priceCents / 100,
      img: i.image,
      pos: i.imagePosition,
      ...(i.badge ? { badge: i.badge } : {}),
      ...(i.allergens.length ? { alg: i.allergens } : {}),
      ...(i.halal ? { halal: true } : {}),
    })),
    ALLERGENS: allergens,
    SLIDES: slides.map((s) => ({ img: s.image, pos: s.imagePosition, id: s.itemId })),
    POPULAR: popular.map((p) => ({ id: p.itemId, feats: p.features })),
    REVIEWS: reviews.map((r) => ({ name: r.name, stars: r.stars, text: r.text, itemId: r.itemId, photo: r.photo })),
    JOURNEY: journey.map((j) => ({ x: j.x, y: j.y, side: j.side, icon: j.icon, img: j.image, tIdx: j.timelineIndex })),
    TIMELINE: timeline,
    GALLERY: gallery.map((g) => ({
      img: g.image,
      ...(g.itemId ? { itemId: g.itemId } : {}),
      ...(g.name ? { name: g.name } : {}),
    })),
    FAQ: faq.map((f) => ({ q: f.question, a: f.answer })),
  };
}

export type DesignData = ReturnType<typeof toDesignData>;
