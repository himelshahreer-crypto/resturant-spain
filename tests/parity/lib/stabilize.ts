/* eslint-disable @typescript-eslint/no-explicit-any */
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

// waitForFunction polls with rAF by default, which the paused fake clock freezes: poll on an interval.
const WAIT = { timeout: 15_000, polling: 100 } as const;

// A capture advances the fake clock by < 1 s in total, far below the 5.5 s hero autoplay.

/** Waits for fonts and images (call after navigation). */
export async function loadAssets(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => (img.complete ? null : img.decode().catch(() => null))));
  });
}

/**
 * Brings the page to a settled state using conditions, not sleeps, so it holds
 * under any CPU load. Both the design and the port run the same effect code:
 *  1. reveal() is armed by a 30 ms timer → advance the fake clock;
 *  2. the IntersectionObserver (real time) starts a reveal animation on every
 *     `[data-reveal]` element in view → wait until all have one (`_revAnim`);
 *  3. revealed `data-wave` cards get a sweep ~280–415 ms later → advance the clock
 *     and wait until each has been swept (`_w`);
 *  4. jump every finite animation to its end and wait for effect spans to go.
 * Call with the viewport expanded to the full page, so every element is in view.
 */
export async function settle(page: Page) {
  await loadAssets(page);
  await page.clock.runFor(50);
  // Elements without a layout box (e.g. the mobile journey on desktop, display:none) never reveal.
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("[data-reveal]")].every(
        (e) => e.getClientRects().length === 0 || (e as any)._revAnim,
      ),
    null,
    WAIT,
  );
  await page.clock.runFor(700);
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("[data-reveal][data-wave]")].every(
        (e) => e.getClientRects().length === 0 || (e as any)._w,
      ),
    null,
    WAIT,
  );
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      const end = a.effect?.getComputedTiming().endTime;
      if (typeof end === "number" && Number.isFinite(end)) a.finish();
    }
  });
  await page.waitForFunction(
    () => !document.querySelector('span[style*="skewX"], span[style*="rgba(255, 255, 255, 0.45)"]'),
    null,
    WAIT,
  );
}

/** Make the viewport as tall as the page so every reveal-on-scroll element is "in view". */
export async function expandToFullPage(page: Page) {
  const size = page.viewportSize()!;
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: size.width, height });
}
