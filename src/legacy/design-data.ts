// Maps the app's content (src/content) back to the exact shapes the design's
// Component class used (CATS, ITEMS, SLIDES, …), so the faithful port of its
// logic (KebabApp.tsx) can stay line-for-line. A unit test proves the result
// equals the design's own data. Removed in Phase 6.
import { categories, items, allergens } from "@/content/menu";
import { slides, popular, reviews, journey, timeline, gallery, faq } from "@/content/home";

export const CATS = categories.map((c) => ({
  id: c.id,
  name: c.name,
  icon: c.icon,
  ...(c.isNew ? { isNew: true } : {}),
}));

export const ITEMS = items.map((i) => ({
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
}));

export const ALLERGENS = allergens;
export const SLIDES = slides.map((s) => ({ img: s.image, pos: s.imagePosition, id: s.itemId }));
export const POPULAR = popular.map((p) => ({ id: p.itemId, feats: p.features }));
export const REVIEWS = reviews.map((r) => ({
  name: r.name,
  stars: r.stars,
  text: r.text,
  itemId: r.itemId,
  photo: r.photo,
}));
export const JOURNEY = journey.map((j) => ({
  x: j.x,
  y: j.y,
  side: j.side,
  icon: j.icon,
  img: j.image,
  tIdx: j.timelineIndex,
}));
export const TIMELINE = timeline;
export const GALLERY = gallery.map((g) => ({
  img: g.image,
  ...(g.itemId ? { itemId: g.itemId } : {}),
  ...(g.name ? { name: g.name } : {}),
}));
export const FAQ = faq.map((f) => ({ q: f.question, a: f.answer }));
