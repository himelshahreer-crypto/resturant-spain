// The static export serves every locale and view with the right document language, the
// self-hosted Inter font, icons, SEO metadata, and no runtime errors or Content Security
// Policy violations (each page carries a strict per-page CSP, see scripts/postbuild.mjs).
import { expect, test, type Page } from "@playwright/test";
import { PORT_URL } from "../../playwright.config";

const PAGES = [
  ["/", "es", "Kebab Factory · Dürüms, pizzas y burgers en Badalona"],
  ["/ca/", "ca", "Kebab Factory · Dürüms, pizzes i burgers a Badalona"],
  ["/en/", "en", "Kebab Factory · Dürüms, pizza & burgers in Badalona"],
  ["/menu/", "es", "Menú · Kebab Factory Badalona"],
  ["/ca/menu/", "ca", "Menú · Kebab Factory Badalona"],
  ["/en/menu/", "en", "Menu · Kebab Factory Badalona"],
] as const;

/** Records page errors and CSP violations (the browser fires securitypolicyviolation). */
async function watch(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  await page.addInitScript(() =>
    document.addEventListener("securitypolicyviolation", (e) =>
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`),
    ),
  );
  return problems;
}

for (const [path, lang, title] of PAGES) {
  test(`${path} renders in ${lang} with a strict CSP and no errors`, async ({ page }) => {
    const problems = await watch(page);
    await page.goto(`${PORT_URL}${path}`);
    await page.waitForSelector("html[data-kf-ready]", { state: "attached" });
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page).toHaveTitle(title);
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
    expect(csp).toContain("script-src 'self' 'sha256-");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(await page.evaluate(() => document.fonts.check("600 16px Inter"))).toBe(true);
    expect(await page.locator("[data-icon] svg").count()).toBeGreaterThan(20);
    expect(await page.locator("#kf-root > .kf-host > div > main").count()).toBe(1);
    // Structured data parses and describes the restaurant.
    const ld = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) => els.map((e) => JSON.parse(e.textContent || "{}")["@type"]));
    expect(ld).toContain("Restaurant");
    expect(ld).toContain(path.includes("menu") ? "Menu" : "FAQPage");
    await page.waitForTimeout(500);
    expect(problems).toEqual([]);
  });
}

test("client-side navigation works under the CSP", async ({ page }) => {
  const problems = await watch(page);
  await page.goto(`${PORT_URL}/`);
  await page.waitForSelector("html[data-kf-ready]", { state: "attached" });
  await page.getByRole("button", { name: "Pedir ahora" }).first().click();
  await expect(page).toHaveURL(/\/menu\/$/);
  await expect(page).toHaveTitle("Menú · Kebab Factory Badalona");
  await page.goBack();
  await expect(page).toHaveTitle("Kebab Factory · Dürüms, pizzas y burgers en Badalona");
  expect(problems).toEqual([]);
});

test("sitemap, robots and manifest are generated", async ({ request }) => {
  const sitemap = await (await request.get(`${PORT_URL}/sitemap.xml`)).text();
  expect(sitemap.match(/<loc>/g)).toHaveLength(6);
  expect(await (await request.get(`${PORT_URL}/robots.txt`)).text()).toContain("Sitemap:");
  const manifest = await (await request.get(`${PORT_URL}/manifest.webmanifest`)).json();
  expect(manifest.short_name).toBe("Kebab Factory");
});
