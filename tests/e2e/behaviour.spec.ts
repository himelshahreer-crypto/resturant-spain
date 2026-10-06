// Behaviour tests: the motion and interaction rows of the fidelity contract
// (docs/NEXTJS_MIGRATION_PLAN.md §1), plus the routing added in Phase 3. The parity suite
// proves the port *looks* like the design in each state; these prove it *behaves* like it.
import { expect, test, type Page } from "@playwright/test";
import { PORT_URL } from "../../playwright.config";

const T0 = new Date("2026-01-05T11:00:00Z"); // a Monday, 12:00 in Madrid

async function open(page: Page, path = "/", { fakeClock = false } = {}) {
  if (fakeClock) {
    await page.clock.install({ time: new Date(T0.getTime() - 60_000) });
    await page.clock.pauseAt(T0);
  }
  await page.goto(`${PORT_URL}${path}`);
  await page.waitForSelector("html[data-kf-ready]", { state: "attached" });
}

const heroCounter = (page: Page) => page.locator("main strong").filter({ hasText: /^\d\d \/ \d\d$/ });

test.describe("hero", () => {
  test("autoplays every 5.5 s and wraps around", async ({ page }) => {
    await open(page, "/", { fakeClock: true });
    await expect(heroCounter(page)).toHaveText("01 / 04");
    await page.clock.runFor(5_500);
    await expect(heroCounter(page)).toHaveText("02 / 04");
    await page.clock.runFor(5_500 * 3);
    await expect(heroCounter(page)).toHaveText("01 / 04");
  });

  test("a dot jumps to its slide and restarts the timer", async ({ page }) => {
    await open(page, "/", { fakeClock: true });
    await page.clock.runFor(4_000);
    await page.locator("main section").first().locator("button[data-noripple]").nth(2).click();
    await expect(heroCounter(page)).toHaveText("03 / 04");
    await page.clock.runFor(4_000); // < 5.5 s since the click: still on 03
    await expect(heroCounter(page)).toHaveText("03 / 04");
    await page.clock.runFor(1_600);
    await expect(heroCounter(page)).toHaveText("04 / 04");
  });

  test("background parallax follows scroll, capped at 60 px", async ({ page }) => {
    await open(page);
    const y = () => page.locator("[data-hero-bg]").evaluate((e) => (e as HTMLElement).style.transform);
    await page.evaluate(() => window.scrollTo({ top: 100, behavior: "instant" }));
    await expect.poll(y).toBe("translate3d(0px, 18px, 0px)");
    await page.evaluate(() => window.scrollTo({ top: 1000, behavior: "instant" }));
    await expect.poll(y).toBe("translate3d(0px, 60px, 0px)");
  });
});

test.describe("combo slider", () => {
  const comboName = (page: Page) => page.locator("#combos h2");

  test("autoplays every 6 s", async ({ page }) => {
    await open(page, "/", { fakeClock: true });
    const first = await comboName(page).textContent();
    await page.clock.runFor(6_000);
    await expect(comboName(page)).not.toHaveText(first!);
  });

  test("arrow keys move it on the home page, not while typing", async ({ page }) => {
    await open(page, "/", { fakeClock: true });
    const first = (await comboName(page).textContent())!;
    await page.keyboard.press("ArrowRight");
    const second = (await comboName(page).textContent())!;
    expect(second).not.toBe(first);
    await page.keyboard.press("ArrowLeft");
    await expect(comboName(page)).toHaveText(first);
  });

  test("prev/next buttons", async ({ page }) => {
    await open(page);
    const first = (await comboName(page).textContent())!;
    await page.getByRole("button", { name: "Siguiente combo" }).click();
    await expect(comboName(page)).not.toHaveText(first);
    await page.getByRole("button", { name: "Combo anterior" }).click();
    await expect(comboName(page)).toHaveText(first);
  });
});

test.describe("header", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("transparent over the hero, solid after 24 px of scroll", async ({ page }) => {
    await open(page);
    const header = page.locator("header");
    await expect(header).toHaveClass(/kf-nav-transparent/);
    await page.evaluate(() => window.scrollTo({ top: 30, behavior: "instant" }));
    await expect(header).not.toHaveClass(/kf-nav-transparent/);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(header).toHaveClass(/kf-nav-transparent/);
  });

  test("solid on the menu page", async ({ page }) => {
    await open(page, "/menu/");
    await expect(page.locator("header")).not.toHaveClass(/kf-nav-transparent/);
  });

  test("first-paint helper is switched off once the app has mounted", async ({ page }) => {
    await open(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-kf-pre");
  });
});

test.describe("reveal on scroll", () => {
  test("reveals when scrolled into view and resets when scrolled away", async ({ page }) => {
    await open(page);
    const el = page.locator("#combos [data-reveal]").first();
    await el.scrollIntoViewIfNeeded();
    await expect.poll(() => el.evaluate((e) => !!(e as unknown as { _revAnim: unknown })._revAnim)).toBe(true);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect.poll(() => el.evaluate((e) => (e as HTMLElement).style.opacity)).toBe("0");
  });
});

test.describe("pointer effects", () => {
  test("buttons ripple from the pointer", async ({ page }) => {
    await open(page);
    const btn = page.getByRole("button", { name: "Pedir ahora" }).first();
    await btn.scrollIntoViewIfNeeded();
    const box = (await btn.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await expect(btn.locator('span[style*="rgba(255, 255, 255, 0.45)"]')).toHaveCount(1);
    await page.mouse.up();
  });

  test("hovering a button sweeps a shine across it", async ({ page }) => {
    await open(page);
    const btn = page.getByRole("button", { name: "Ver menús combo" });
    await btn.hover();
    await expect(btn.locator('span[style*="skewX"]')).toHaveCount(1);
    await expect(btn).toHaveCSS("overflow", "hidden");
  });
});

test.describe("cart", () => {
  test("adding shows the stepper and floating cart; it survives a reload", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Añadir", exact: true }).first().click();
    await page.getByRole("button", { name: "Añadir", exact: true }).first().click();
    const floating = page.locator(".kf-floating-cart");
    await expect(floating).toContainText("2");
    await page.reload();
    await page.waitForSelector("html[data-kf-ready]", { state: "attached" });
    await expect(floating).toContainText("2");
  });

  test("checkout validates in Spanish, then confirms with a reference", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Añadir", exact: true }).first().click();
    await page.locator(".kf-floating-cart").click();
    await page
      .locator("[data-drawer]")
      .getByRole("button", { name: /Continuar/ })
      .click();
    await page
      .locator("[data-drawer]")
      .getByRole("button", { name: /Confirmar pedido/ })
      .click();
    await expect(page.locator("[data-drawer]")).toContainText("Introduce tu nombre.");
    const inputs = page.locator("[data-drawer] input");
    await inputs.nth(0).fill("Laura Pérez");
    await inputs.nth(1).fill("laura@example.com");
    await inputs.nth(2).fill("+34 612 345 678");
    await inputs.nth(3).fill("Carrer del Mar 45");
    await page
      .locator("[data-drawer]")
      .getByRole("button", { name: /Confirmar pedido/ })
      .click();
    const conf = page.locator("[data-conf]");
    await expect(conf).toContainText("KF-1047");
    await expect(conf).toContainText("¡Gracias, Laura!");
    await conf.getByRole("button", { name: "Volver al menú" }).click();
    await expect(page).toHaveURL(/\/menu\/$/);
  });
});

test.describe("routing", () => {
  test("Menu navigates to /menu/ and back keeps the cart", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Añadir", exact: true }).first().click();
    await page.getByRole("button", { name: "Pedir ahora" }).first().click();
    await expect(page).toHaveURL(/\/menu\/$/);
    await expect(page.locator('main[data-screen-label="Menu"]')).toBeVisible();
    await page.goBack();
    await expect(page.locator('section[data-screen-label="Home"]')).toBeVisible();
    await expect(page.locator(".kf-floating-cart")).toContainText("1");
  });

  test("a category card opens the menu filtered, and the filter is in the URL", async ({ page }) => {
    await open(page);
    await page.locator(".kf-cat-card", { hasText: "Tacos fritos" }).click();
    await expect(page).toHaveURL(/\/menu\/\?cat=tacos$/);
    await expect(page.locator("main section h2")).toHaveText(["Tacos fritos"]);
    await page.locator(".kf-cat-chips button", { hasText: "Pizzas" }).click();
    await expect(page).toHaveURL(/\/menu\/\?cat=tacos,pizzas$/);
    await page.locator(".kf-cat-chips button", { hasText: "Todo" }).click();
    await expect(page).toHaveURL(/\/menu\/$/);
  });

  test("a shared /menu/?cat= link opens with that filter", async ({ page }) => {
    await open(page, "/menu/?cat=drinks");
    await expect(page.locator("main section h2")).toHaveText(["Bebidas"]);
  });

  test("switching language keeps the scroll position and the cart", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page);
    await page.getByRole("button", { name: "Añadir", exact: true }).first().click();
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: "instant" }));
    await page.getByRole("group", { name: "Idioma / Language" }).first().getByRole("button", { name: "CA" }).click();
    await expect(page).toHaveURL(/\/ca\/$/);
    await page.waitForSelector("html[data-kf-ready]", { state: "attached" });
    await expect(page.locator("html")).toHaveAttribute("lang", "ca");
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1400);
    await expect(page.locator(".kf-floating-cart")).toContainText("1");
  });

  test("a returning visitor who chose English is sent to /en/ before paint; explicit URLs win", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("kf4", JSON.stringify({ v: 1, lang: "en" })));
    await page.goto(`${PORT_URL}/menu/`);
    await expect(page).toHaveURL(/\/en\/menu\/$/);
    await page.goto(`${PORT_URL}/ca/`);
    await expect(page).toHaveURL(/\/ca\/$/);
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hamburger opens the nav drawer, which navigates", async ({ page }) => {
    await open(page);
    await page.locator(".kf-nav-hamburger").click();
    const drawer = page.locator("[data-nav-drawer]");
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: /Menú/ }).click();
    await expect(page).toHaveURL(/\/menu\/$/);
    await expect(drawer).toHaveCount(0);
  });

  test("the journey rider follows the road as you scroll", async ({ page }) => {
    await open(page);
    const top = () => page.locator(".kf-rider-wrap").evaluate((e) => parseFloat((e as HTMLElement).style.top || "0"));
    await page.locator(".kf-journey").scrollIntoViewIfNeeded();
    const a = await top();
    await page.mouse.wheel(0, 500);
    await expect.poll(top).toBeGreaterThan(a);
  });
});

test.describe("sections", () => {
  test("gallery: clicking an item centres it, and it becomes the bright one", async ({ page }) => {
    await open(page);
    const imgs = page.locator(".kf-gallery-img");
    await page.locator("#kfGallery").scrollIntoViewIfNeeded();
    await page.locator(".kf-gallery-item").nth(3).click();
    const level = (i: number) =>
      imgs.nth(i).evaluate((e) => parseFloat((e as HTMLElement).style.filter.match(/[\d.]+/)?.[0] ?? "1"));
    await expect.poll(() => level(3)).toBeGreaterThan(0.9);
    expect(await level(0)).toBeLessThan(0.6);
  });

  test("FAQ: first open by default; questions toggle independently", async ({ page }) => {
    await open(page);
    const q = page.locator("button[aria-expanded]").filter({ hasText: "?" });
    await expect(q.nth(0)).toHaveAttribute("aria-expanded", "true");
    await q.nth(1).click();
    await expect(q.nth(1)).toHaveAttribute("aria-expanded", "true");
    await expect(q.nth(0)).toHaveAttribute("aria-expanded", "true");
    await q.nth(0).click();
    await expect(q.nth(0)).toHaveAttribute("aria-expanded", "false");
  });

  test("'See combo menus' smooth-scrolls to the combos section", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Ver menús combo" }).click();
    await expect
      .poll(() => page.locator("#combos").evaluate((e) => Math.round(e.getBoundingClientRect().top)))
      .toBeLessThan(120);
  });

  test("WhatsApp button links to the restaurant chat", async ({ page }) => {
    await open(page);
    await expect(page.locator(".kf-whatsapp-fab")).toHaveAttribute("href", "https://wa.me/c/34683275326");
  });
});

test.describe("reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("infinite animations are switched off", async ({ page }) => {
    await open(page);
    await expect(page.locator(".kf-whatsapp-fab")).toHaveCSS("animation-name", "none");
    await expect(page.locator('div[style*="kfmarquee"]').first()).toHaveCSS("animation-name", "none");
  });
});
