// Phase 1: the static export serves every locale with the right document
// language, the self-hosted Inter font and all 66 icons.
import { expect, test } from "@playwright/test";
import { openPort } from "./lib/pages";

for (const [path, lang] of [
  ["/", "es"],
  ["/ca/", "ca"],
  ["/en/", "en"],
] as const) {
  test(`${path} renders in ${lang}`, async ({ browser }) => {
    const errors: string[] = [];
    const page = await openPort(browser, { width: 1280, path });
    page.on("pageerror", (e) => errors.push(e.message));
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    expect(await page.evaluate(() => document.fonts.check("600 16px Inter"))).toBe(true);
    expect(await page.locator("[data-icon] svg").count()).toBe(66);
    expect(await page.locator("#kf-root > .kf-host > main").count()).toBe(1);
    expect(errors).toEqual([]);
  });
}
