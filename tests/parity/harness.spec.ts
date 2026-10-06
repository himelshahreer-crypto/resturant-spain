// Phase 1: proves the parity harness itself is trustworthy before it's used
// to judge the port: the baseline is deterministic, and a change is caught.
import { expect, test } from "@playwright/test";
import { collect, ROOTS } from "./lib/collect";
import { compareSnaps, formatDiffs } from "./lib/compare";
import { closeOpenPages, openDesign } from "./lib/pages";
import { expandToFullPage, settle } from "./lib/stabilize";

test.afterEach(closeOpenPages);

for (const width of [390, 1440]) {
  test(`baseline is deterministic at ${width}px`, async ({ browser }) => {
    const a = await openDesign(browser, { width });
    const b = await openDesign(browser, { width });
    for (const p of [a, b]) {
      await expandToFullPage(p);
      await settle(p);
    }
    const [sa, sb] = [await collect(a, ROOTS.design), await collect(b, ROOTS.design)];
    expect(sa.length).toBeGreaterThan(500);
    const diffs = compareSnaps(sa, sb);
    expect(diffs, formatDiffs(diffs)).toEqual([]);
  });
}

test("comparator catches a one-pixel and a colour change", async ({ browser }) => {
  const a = await openDesign(browser, { width: 1280 });
  const b = await openDesign(browser, { width: 1280 });
  await b.evaluate(() => {
    const h1 = document.querySelector("#dc-root h1") as HTMLElement;
    h1.style.marginTop = "2px";
    (document.querySelector("#dc-root footer") as HTMLElement).style.backgroundColor = "#E63E01";
  });
  const diffs = compareSnaps(await collect(a, ROOTS.design), await collect(b, ROOTS.design), 100_000);
  expect(diffs.some((d) => d.path.endsWith("h1[1]") || d.field === "y")).toBe(true);
  expect(diffs.some((d) => d.field === "background-color" && d.port === "rgb(230, 62, 1)")).toBe(true);
});
