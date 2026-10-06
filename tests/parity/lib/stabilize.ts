import type { Page } from "@playwright/test";

/** A fixed moment (Monday 2026-01-05 13:00 Madrid) so time-dependent text is stable. */
export const FROZEN_TIME = new Date("2026-01-05T12:00:00Z");

/**
 * Call before navigation. Installs a fake clock: Date, timers and rAF only move
 * when the harness advances them, so autoplay sliders (5.5 s / 6 s intervals)
 * never fire mid-capture and the "open today" text is fixed.
 */
export async function freezeTime(page: Page) {
  await page.clock.install({ time: FROZEN_TIME });
  // install() alone lets time keep flowing; pause it so only runFor() moves it.
  await page.clock.pauseAt(new Date(FROZEN_TIME.getTime() + 10));
}

/**
 * Fake time advanced per settle. Pending effect timers need ~500 ms; a capture
 * calls settle at most twice, and the total must stay well below the 5.5 s
 * hero autoplay so the slider never moves.
 */
const SETTLE_TICK_MS = 700;
const ROUND_TICK_MS = 100;

/**
 * Waits until the page is visually settled: fonts loaded, images decoded,
 * finite animations (reveals, drawer slide-ins) jumped to their end state.
 * Infinite CSS loops are already disabled by the design's own
 * prefers-reduced-motion rule (contexts run with reducedMotion: "reduce").
 */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => (img.complete ? null : img.decode().catch(() => null))));
  });
  // Effects are scheduled after reveals (the shine sweep fires at delay×45 + 280 ms),
  // so wait past the longest delay, then jump every finite animation to its end.
  // Repeat because finishing one animation can start the next (reveal → sweep).
  // Let IntersectionObserver callbacks (real time) schedule their reveal/sweep
  // timers first, then advance fake time past those timers.
  await page.waitForTimeout(300);
  await page.clock.runFor(SETTLE_TICK_MS);
  // Loop until one full round starts no new finite animation.
  for (let round = 0, quiet = 0; round < 10 && quiet < 2; round++) {
    const finished = await page.evaluate(() => {
      let n = 0;
      for (const a of document.getAnimations()) {
        const end = a.effect?.getComputedTiming().endTime;
        if (typeof end === "number" && Number.isFinite(end) && a.playState !== "finished") {
          a.finish();
          n++;
        }
      }
      return n;
    });
    await page.clock.runFor(ROUND_TICK_MS);
    // Real time: IntersectionObserver callbacks (which start reveals) are not on the fake clock.
    await page.waitForTimeout(200);
    quiet = finished === 0 ? quiet + 1 : 0;
  }
}

/** Make the viewport as tall as the page so every reveal-on-scroll element is "in view". */
export async function expandToFullPage(page: Page) {
  const size = page.viewportSize()!;
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: size.width, height });
  await settle(page);
}
