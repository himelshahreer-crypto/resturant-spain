/**
 * Pauses the CSS animations of page sections that are off screen (Phase 4, performance).
 * The design runs ~50 infinite animations at once (floating vegetables, marquee, step borders,
 * journey rider, sign, …); on phones that costs CPU and battery even when nobody can see them.
 * A section gets `data-kf-offscreen` while it is more than 200 px outside the viewport, and
 * enhancements.css pauses its animations (`animation-play-state`); they resume where they
 * left off when it comes back. Nothing visible changes. Reveal effects (Web Animations API)
 * are unaffected: animation-play-state only applies to CSS animations.
 */
export function startOffscreenPause(root: HTMLElement): () => void {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.target.toggleAttribute("data-kf-offscreen", !e.isIntersecting);
    },
    { rootMargin: "200px 0px" },
  );
  const watched = new WeakSet<Element>();
  const scan = () => {
    for (const el of root.querySelectorAll(":scope > div > main > *")) {
      if (watched.has(el)) continue;
      watched.add(el);
      io.observe(el);
    }
  };
  scan();
  // Home ↔ menu swaps the sections: watch for new ones.
  const mo = new MutationObserver(scan);
  mo.observe(root, { childList: true, subtree: true });
  return () => {
    io.disconnect();
    mo.disconnect();
  };
}
