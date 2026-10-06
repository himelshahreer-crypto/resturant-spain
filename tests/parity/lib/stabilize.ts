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
  // install() lets time flow until paused, and pauseAt() can't go backwards. Install a minute
  // early so the pause target is always in the future, even on a heavily loaded machine.
  await page.clock.install({ time: new Date(FROZEN_TIME.getTime() - 60_000) });
  await page.clock.pauseAt(FROZEN_TIME);
}

// Note: page.waitForFunction polls with rAF by default, which the paused fake clock freezes,
// so waits here poll with page.evaluate + waitForTimeout instead.

// A capture advances the fake clock by < 1 s in total, far below the 5.5 s hero autoplay.

/** Waits for fonts and images (call after navigation). */
export async function loadAssets(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => (img.complete ? null : img.decode().catch(() => null))));
  });
}

/**
 * The reveal state the design's IntersectionObserver (threshold 0.12, rootMargin bottom
 * -60px) will settle on for an element: "in" (reveal animation running), "out" (reset),
 * or "skip" when it has no layout box (the hidden mobile/desktop journey) or sits within
 * 1 % of the threshold, where the outcome is legitimately order-dependent.
 * Serialised into the page, so it must be self-contained.
 */
function expectedReveal(e: Element): "in" | "out" | "skip" {
  if (e.getClientRects().length === 0) return "skip";
  const r = e.getBoundingClientRect();
  if (r.height === 0 || r.width === 0) return "skip";
  const v = Math.max(0, Math.min(r.bottom, innerHeight - 60) - Math.max(r.top, 0));
  const h = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
  const ratio = (v / r.height) * (h / r.width);
  if (Math.abs(ratio - 0.12) < 0.01) return "skip";
  return ratio >= 0.12 ? "in" : "out";
}

/** Total fake time a settle may advance: well below the 5.5 s hero autoplay. */
const FAKE_BUDGET_MS = 3000;

/**
 * Brings the page to a settled state using conditions, not sleeps, so it holds
 * under any CPU load. Both the design and the port run the same effect code:
 *  1. reveal() is armed by a 30 ms timer → advance the fake clock;
 *  2. the IntersectionObserver (real time) reveals elements in view and resets the
 *     ones out of view → wait until every element is in its expected state;
 *  3. revealed `data-wave` cards get a sweep timer when revealed → keep advancing the
 *     fake clock in small steps until each has been swept (`_w`);
 *  4. jump every finite animation to its end, until no new ones start.
 */
export async function settle(page: Page, scope?: string) {
  // With a scope, only elements inside it must settle (see ParityState.scope).
  const inScope = scope ?? ":root";
  await loadAssets(page);
  await page.clock.runFor(50);
  const src = expectedReveal.toString();
  // Poll (instead of waitForFunction) so a timeout reports exactly which elements are stuck.
  const deadline = Date.now() + 45_000;
  for (;;) {
    const stuck = await page.evaluate(
      ([fnSrc, sel]) => {
        const expected = new Function(`return (${fnSrc})`)() as (e: Element) => string;
        const bad: string[] = [];
        for (const e of document.querySelectorAll(`:is(${sel}) [data-reveal], :is(${sel})[data-reveal]`)) {
          const want = expected(e);
          const anim = (e as any)._revAnim;
          if (want === "skip" || (want === "in" ? !!anim : !anim)) continue;
          const r = e.getBoundingClientRect();
          bad.push(
            `${e.tagName.toLowerCase()}.${(e as HTMLElement).className || ""} want=${want} top=${Math.round(r.top)} h=${Math.round(r.height)} vh=${innerHeight}`,
          );
        }
        return bad;
      },
      [src, inScope] as const,
    );
    if (!stuck.length) break;
    if (Date.now() > deadline)
      throw new Error(
        `settle: reveal state not reached for ${stuck.length} element(s):\n  ${stuck.slice(0, 8).join("\n  ")}`,
      );
    await page.waitForTimeout(100);
  }
  let advanced = 50;
  for (;;) {
    const swept = await page.evaluate(
      ([fnSrc, sel]) => {
        const expected = new Function(`return (${fnSrc})`)() as (e: Element) => string;
        return [...document.querySelectorAll(`:is(${sel}) [data-reveal][data-wave]`)].every(
          (e) => expected(e) !== "in" || !!(e as any)._w,
        );
      },
      [src, inScope] as const,
    );
    if (swept) break;
    if (advanced >= FAKE_BUDGET_MS)
      throw new Error("settle: revealed cards were not swept within the fake-time budget");
    await page.clock.runFor(50);
    advanced += 50;
    await page.waitForTimeout(30);
  }
  // Finish every finite animation, then require a quiet period: observer callbacks arrive in
  // real time and can start a late reveal (an element right at the threshold). Two consecutive
  // polls must find nothing new to finish.
  for (let quiet = 0, rounds = 0; quiet < 2; rounds++) {
    if (rounds > 40) throw new Error("settle: animations kept starting");
    const finished = await page.evaluate((sel) => {
      let n = 0;
      const regions = [...document.querySelectorAll(sel)];
      for (const a of document.getAnimations()) {
        const target = (a.effect as KeyframeEffect | null)?.target;
        if (target && !regions.some((r) => r.contains(target))) continue;
        const end = a.effect?.getComputedTiming().endTime;
        if (typeof end === "number" && Number.isFinite(end) && a.playState !== "finished") {
          a.finish();
          n++;
        }
      }
      return n;
    }, inScope);
    quiet = finished === 0 ? quiet + 1 : 0;
    await page.waitForTimeout(250);
  }
  // Effect spans (ripple/sweep) whose animations were finished may linger until their onfinish
  // callback runs (starved under load). They're invisible and the collector skips them; the
  // sweep's lasting effect, the style on its host, is applied when it starts.
}

/** Make the viewport as tall as the page so every reveal-on-scroll element is "in view". */
export async function expandToFullPage(page: Page) {
  const size = page.viewportSize()!;
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: size.width, height });
}

/**
 * Waits for a condition while letting the paused fake clock advance in small steps
 * (React updates, router transitions and the design's timers run on that clock).
 */
export async function waitForApp(page: Page, predicate: string, what: string) {
  // A time-based deadline (not an iteration count) so a busy machine doesn't cause false failures.
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await page.evaluate(predicate)) return;
    await page.clock.runFor(16);
    await page.waitForTimeout(20);
  }
  throw new Error(`Timed out waiting for ${what}: ${predicate}`);
}
