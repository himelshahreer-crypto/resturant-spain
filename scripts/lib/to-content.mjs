// Maps the design's raw data (scripts/lib/design-extract.mjs) to the app's
// content shapes (src/content/types.ts). Pure function, shared with the tests.
export function toContent(d) {
  const cents = (euros) => Math.round(euros * 100);
  return {
    categories: d.categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      ...(c.isNew ? { isNew: true } : {}),
    })),
    items: d.items.map((i) => ({
      id: i.id,
      categoryId: i.cat,
      name: i.name,
      description: i.desc,
      priceCents: cents(i.price),
      image: i.img,
      imagePosition: i.pos,
      ...(i.badge ? { badge: i.badge } : {}),
      allergens: i.alg || [],
      ...(i.halal ? { halal: true } : {}),
      available: true,
    })),
    allergens: d.allergens,
    slides: d.slides.map((s) => ({ image: s.img, imagePosition: s.pos, itemId: s.id })),
    popular: d.popular.map((p) => ({ itemId: p.id, features: p.feats })),
    reviews: d.reviews.map((r) => ({ name: r.name, stars: r.stars, text: r.text, itemId: r.itemId, photo: r.photo })),
    journey: d.journey.map((j) => ({
      x: j.x,
      y: j.y,
      side: j.side,
      icon: j.icon,
      image: j.img,
      timelineIndex: j.tIdx,
    })),
    timeline: d.timeline,
    gallery: d.gallery.map((g) => ({
      image: g.img,
      ...(g.itemId ? { itemId: g.itemId } : {}),
      ...(g.name ? { name: g.name } : {}),
    })),
    faq: d.faq.map((f) => ({ question: f.q, answer: f.a })),
  };
}
