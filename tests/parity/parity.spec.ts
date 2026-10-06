// Phase 2 gate: the port must match the design element by element at every
// viewport and state. Enabled once pages are ported (PARITY_ENABLED=1, then by default).
import { expect, test } from "@playwright/test";
import { collect, ROOTS } from "./lib/collect";
import { compareSnaps, formatDiffs } from "./lib/compare";
import { openDesign, openPort } from "./lib/pages";
import { expandToFullPage } from "./lib/stabilize";
import { STATES, VIEWPORTS } from "./matrix";

test.skip(!process.env.PARITY_ENABLED, "Enabled in Phase 2, once the pages are ported");

for (const state of STATES) {
  for (const width of VIEWPORTS) {
    test(`${state.name} @ ${width}px matches the design`, async ({ browser }) => {
      const design = await openDesign(browser, { width });
      const port = await openPort(browser, { width, path: state.portPath });
      for (const page of [design, port]) {
        if (state.act) await state.act(page);
        if (state.fullPage) await expandToFullPage(page);
      }
      const diffs = compareSnaps(await collect(design, ROOTS.design), await collect(port, ROOTS.port));
      expect(diffs, formatDiffs(diffs)).toEqual([]);
    });
  }
}
