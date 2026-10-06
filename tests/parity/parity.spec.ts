// Phase 2 gate: the port must match the design element by element at every
// viewport and state.
import { expect, test } from "@playwright/test";
import { collect, ROOTS } from "./lib/collect";
import { compareSnaps, formatDiffs } from "./lib/compare";
import { closeOpenPages, openDesign, openPort } from "./lib/pages";
import { expandToFullPage, settle } from "./lib/stabilize";
import { STATES, VIEWPORTS } from "./matrix";

test.afterEach(closeOpenPages);

for (const state of STATES) {
  for (const width of VIEWPORTS) {
    if (state.widths && !state.widths(width)) continue;
    test(`${state.name} @ ${width}px matches the design`, async ({ browser }) => {
      const design = await openDesign(browser, { width, lang: state.designLang, view: state.designView });
      const port = await openPort(browser, { width, path: state.portPath ?? "/" });
      for (const page of [design, port]) {
        if (state.act) await state.act(page);
        if (!state.viewportOnly) await expandToFullPage(page);
        await settle(
          page,
          state.scope && `${page === design ? ROOTS.design : ROOTS.port} ${state.scope.replace(":scope ", "")}`,
        );
      }
      const diffs = compareSnaps(
        await collect(design, ROOTS.design, state.scope),
        await collect(port, ROOTS.port, state.scope),
      );
      if (state.scope) expect((await collect(port, ROOTS.port, state.scope)).length).toBeGreaterThan(20);
      expect(diffs, formatDiffs(diffs)).toEqual([]);
    });
  }
}
