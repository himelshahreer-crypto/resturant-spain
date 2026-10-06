# Kebab Factory: Next.js migration plan (v2)

**Source of truth:** `design/index.html` (Claude Design export, "Kebab Factory v3 Hearth")
**Goal:** A production Next.js app that looks and behaves exactly like the design at every breakpoint, including every animation, scroll effect and interaction, and that can be maintained and extended for years.
**Status:** v2, rewritten after the red-team review in [`PLAN_REVIEW.md`](PLAN_REVIEW.md). Scope: frontend only; backend and admin later.

---

## 0. What we were handed (audit)

### 0.1 Files

| Path                                                             | What it is                                                                                                                                                                                               | Used by the page?                                                       |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `design/index.html`                                              | The whole site: one `<x-dc>` template (~900 lines of HTML with inline styles), one `<style>` block (~180 rules/keyframes) and one `Component` class (~470 lines of logic and all content in 3 languages) | Yes, this is the design                                                 |
| `design/Kebab Factory v3 Hearth.dc.html`                         | Byte-for-byte copy of `index.html`                                                                                                                                                                       | Duplicate, ignore                                                       |
| `design/support.js`                                              | Claude Design runtime (`dc-runtime`). Loads React 18 + Babel from unpkg at runtime, compiles the template, turns `style-hover="…"` into generated `:hover{…!important}` classes                          | Prototype only, **not shipped**                                         |
| `design/kf-icons.js`                                             | `<kf-i n s w>` web component: 66 Lucide-style SVG paths in a shadow root                                                                                                                                 | Port to a React `<Icon>`                                                |
| `design/assets/food` (25), `assets/veg` (9), `assets/people` (3) | Photography, 4.1 MB + 276 KB + 680 KB. All 37 files are referenced                                                                                                                                       | Yes                                                                     |
| `design/_ds/organic-*`                                           | "Organic" design system (Caprasimo/Figtree, terracotta)                                                                                                                                                  | **Not used.** The page uses Inter and its own palette. Do not import it |
| `design/uploads/`, `design/scratch/`                             | Reference screenshots the designer worked from                                                                                                                                                           | Reference only                                                          |

### 0.2 How the prototype works (and what that means for the port)

- **One component, two "views".** `state.view` switches between `home` and `menu`. In Next.js these become two real routes (`/` and `/menu`), so they are shareable, crawlable and the browser back button works.
- **All styling is inline**, with dynamic values injected via `{{ }}` (e.g. chip background `#FF4D1C` when on). Hover/active/focus states come from `style-hover`/`style-active`/`style-focus`, which the runtime compiles to `:hover` rules with `!important`.
- **All content lives in the JS class**: 6 categories, 23 items, allergens, 4 hero slides, 6 "popular" entries, 3 reviews, 4 timeline stops, 8 gallery images, 7 FAQs and ~110 UI strings, each in `en`/`es`/`ca` via `N(en, es, ca)`. Catalan falls back to Spanish.
- **State is persisted to `localStorage['kf4']`** (cart, language, filters, FAQ open state, _and the checkout form including name/email/phone/address_), and synced across tabs via the `storage` event.
- **Checkout is fake.** `place()` validates, builds an order object, puts it in local state and shows a confirmation saying "We sent a confirmation to …". Nothing is sent anywhere.
- **Leftovers from an admin prototype** are still in the code: a seeded `orders` array with realistic personal data (`Laura Pérez`, `laura.p@gmail.com`, phone numbers, addresses), order statuses `new/preparing/delivered`, an editable `eta`, `parsePrice`, admin icons (`kanban`, `dash`, `chart`…), `JOURNEY_AMBIENT`, `HERO`/`heroDish`, `ddOpen`, the `data-count` counter animation. None of it is rendered on the customer site. It tells us an **owner dashboard was planned** (see Phase 6). The fake personal data must not ship.

### 0.3 Breakpoints in use (must be preserved exactly)

`420`, `480`, `640`, `767/768`, `859/860`, `900`, `960` (media queries) and **container queries** on the home menu grid (`[data-pop]`: 1 col → 2 cols at 460 px → 4 cols at 960 px container width). Fluid sizing everywhere via `clamp()`.

---

## 1. Fidelity contract: every behaviour that must survive

This is the checklist QA signs off against. Every row gets a Playwright test (behaviour) and is in the visual-regression suite (look).

| #   | Area                            | Exact behaviour in the design                                                                                                                                                                                                                                                                                                                                                     | How it's built in Next.js                                                                                                                                                                                                                             |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Header                          | Over the hero on ≥900 px, the util bar + header are transparent with white text (`margin-bottom:-149px` overlay). After `scrollY > 24` (or on `/menu`, or <900 px) they turn solid: `rgba(255,248,242,.97)` + `blur(14px)`, util bar `#2C1D12`, all with a `.25s` transition. Language toggle colours follow                                                                      | `<SiteHeader>` client component; `useScrolled(24)` hook sets `data-overlay` on `<header>`. **Width is handled in CSS media queries, not JS**, so SSR and first paint match (the design reads `innerWidth` in JS, which would cause a hydration flash) |
| 2   | Hero slider                     | 4 slides, autoplay every 5.5 s (home only). Transition: incoming slide reveals with a `clip-path: circle(0%→150%)` from a per-index origin, 1100 ms `cubic-bezier(.77,0,.18,1)`; outgoing image darkens to `brightness(.6)` over 1000 ms. Each slide has its own Ken Burns loop (`kfkb0/1/2`, 13 s alternate, negative offsets). Optional video per slide (`heroVideos` prop)     | `<HeroSlider>` client component, same Web Animations API calls, ported 1:1. Images via `next/image` (`fill`, `priority` on slide 1, `sizes="100vw"`) with `object-position` = the design's `background-position`                                      |
| 3   | Hero controls                   | Counter `01 / 04`; dots: active dot grows to 44 px and fills with `kffill 5.5s linear`; clicking a dot jumps and restarts the timer. "On the grill now" card shows current slide's item, price, thumbnail (`.42s` bg transition) and an add button                                                                                                                                | Same component; timer in a `useInterval` that resets on manual navigation                                                                                                                                                                             |
| 4   | Hero parallax                   | Background layer `translate3d(0, min(scrollY×0.18, 60px), 0)`                                                                                                                                                                                                                                                                                                                     | Shared rAF-throttled scroll loop (`useScrollFrame`), one listener for the whole page                                                                                                                                                                  |
| 5   | Reveal-on-scroll                | Every `[data-reveal=n]` animates in (`opacity 0, translateY(26px) scale(.96)` → none, 520 ms, delay `n×45ms`, `cubic-bezier(.2,1.08,.3,1)`) when 12 % visible (`rootMargin 0 0 -60px 0`). **On leaving the viewport it resets** (`translateY(36px) scale(.94)`), so it replays every time. Re-scanned after view/filter/search changes                                            | `<RevealProvider>` with one `IntersectionObserver` plus a `MutationObserver` (picks up new cards after filtering). Elements keep the `data-reveal` attribute so markup stays the same. Content is visible without JS (SEO-safe)                       |
| 6   | Shine sweep                     | Cards with `data-wave` get a diagonal shine sweep 280 ms after reveal; any button or `[data-wave]` gets one on hover (1.5 s cooldown per element). Shine colour is chosen from the element's computed background luminance. **Side effect to keep:** the sweep permanently sets `position: relative; overflow: hidden` on every element it touches (found by the Phase 1 harness) | Ported into `<InteractionEffects>`, one delegated `pointerover` listener, same maths                                                                                                                                                                  |
| 7   | Ripple                          | Every `<button>` (except `data-noripple`) gets a white ripple from the pointer position, 480 ms                                                                                                                                                                                                                                                                                   | Same component, one delegated `pointerdown` listener                                                                                                                                                                                                  |
| 8   | Marquee                         | Lime band, list rendered twice, `translateX(-50%)` over 34 s linear, infinite                                                                                                                                                                                                                                                                                                     | CSS only, server component                                                                                                                                                                                                                            |
| 9   | Floating vegetables             | 6 decorative layers (37 images: 5 on home, 1 fixed on `/menu`) with `kfbob`/`kfsway` at individual sizes, positions, durations, delays and opacities; the `/menu` layer also carries the faded background photo                                                                                                                                                                   | `<VegLayer preset="…">` server component; positions kept as data arrays copied verbatim; `aria-hidden`, `loading="lazy"`, tiny `sizes`                                                                                                                |
| 10  | Category cards                  | Hover: card goes `#FF4D1C`, lifts `-4px scale(1.015)`, text white, dot lime; click goes to `/menu?cat=<id>`                                                                                                                                                                                                                                                                       | CSS module, `<Link>`                                                                                                                                                                                                                                  |
| 11  | Home menu filter                | Multi-select chips (All + 6), hover lift, horizontal scroll with fade mask on mobile, wrap on ≥768. Grid uses container queries 1/2/4 cols                                                                                                                                                                                                                                        | Client component, filter state local (home) / in URL (menu)                                                                                                                                                                                           |
| 12  | Product card                    | Hover lift; Add button turns into a −/qty/+ stepper when in cart; halal + allergen tags; optional badge                                                                                                                                                                                                                                                                           | `<ProductCard>` (server markup + small client `<AddToCart>` island)                                                                                                                                                                                   |
| 13  | Cart bump                       | Header cart button scales 1 → 1.12 → 1 (300 ms) on every add                                                                                                                                                                                                                                                                                                                      | Cart store emits an event; header subscribes                                                                                                                                                                                                          |
| 14  | Floating cart                   | Fixed bottom pill when cart > 0 ("3 View order · 24.30 €"); full-width variant at ≤480 px leaving room for the WhatsApp FAB                                                                                                                                                                                                                                                       | Client component                                                                                                                                                                                                                                      |
| 15  | Combos slider                   | Dark section, background images slide with `translateX`, 650 ms `cubic-bezier(.65,0,.35,1)`; autoplay 6 s; prev/next arrows; dots; **← / → keys** (home only, not while typing); "Add to order" ↔ "Add another"                                                                                                                                                                   | `<ComboSlider>` client component                                                                                                                                                                                                                      |
| 16  | How it works                    | 3 glass cards; a dash of light travels around each card border (`kfBorderTravel` 9 s, staggered 0/3/6 s); icon and number badge pulse in sync; dot travels along the dashed connector (horizontal wave ≥768, vertical line on mobile)                                                                                                                                             | CSS only, copied keyframes                                                                                                                                                                                                                            |
| 17  | Our story, mobile/tablet (<960) | Vertical road; the rider icon **follows the road based on scroll progress** (`getPointAtLength`) and bobs; 4 timeline cards alternate sides                                                                                                                                                                                                                                       | `<JourneyVertical>` client island using the shared scroll loop                                                                                                                                                                                        |
| 18  | Our story, desktop (≥960)       | Curved horizontal road; the rider drives it on an 11.7 s CSS loop, stopping at each pin; cards pop in at 0/3.2/6.4/9.6 s                                                                                                                                                                                                                                                          | CSS only                                                                                                                                                                                                                                              |
| 19  | Gallery                         | Full-bleed scroll-snap carousel; each image's brightness and its label/zoom-icon opacity depend on distance from the centre (updated on horizontal scroll); click centres an item                                                                                                                                                                                                 | `<Gallery>` client island                                                                                                                                                                                                                             |
| 20  | FAQ                             | Accordion, first item open by default, multiple open allowed, `max-height .3s`, chevron rotates                                                                                                                                                                                                                                                                                   | Client component (`<details>` won't animate the same way, so keep buttons + `aria-expanded`)                                                                                                                                                          |
| 21  | FAQ photo grid / Find us        | Static grids, gradient overlays, stats; swinging "OPEN / TODAY" sign (`kfswing` 2.6 s)                                                                                                                                                                                                                                                                                            | Server components, CSS                                                                                                                                                                                                                                |
| 22  | "Open today" pill               | Pulsing green dot; closing time 00:00 on Fri/Sat, else 23:30                                                                                                                                                                                                                                                                                                                      | Computed in **Europe/Madrid** time, not the visitor's or the server's timezone                                                                                                                                                                        |
| 23  | WhatsApp FAB                    | Fixed, green, pulse ring, links to `wa.me/c/34683275326`                                                                                                                                                                                                                                                                                                                          | Server component                                                                                                                                                                                                                                      |
| 24  | Mobile nav (<860)               | Hamburger opens a left drawer with Home/Menu (current page highlighted) and language buttons                                                                                                                                                                                                                                                                                      | Client component, adds focus trap + Esc (see §6)                                                                                                                                                                                                      |
| 25  | Cart drawer                     | Right drawer slides in (320 ms). Steps: empty → cart lines → checkout form (4 fields with inline validation in 3 languages, cash/card radio) → place order                                                                                                                                                                                                                        | Client component; form via React Hook Form + Zod (same rules), submitted through `OrderService` (§3)                                                                                                                                                  |
| 26  | Confirmation modal              | Enters in 380 ms; green ring animates from empty to the remaining-time fraction over 1 s; minutes count down (refresh every 15 s); "Back to the menu" goes to `/menu`                                                                                                                                                                                                             | Client component; data comes from `OrderService.placeOrder()`                                                                                                                                                                                         |
| 27  | Language                        | ES (default) / CA / EN toggle in header and drawer; `<html lang>` updates                                                                                                                                                                                                                                                                                                         | Locale in the URL (`/`, `/ca`, `/en`) with next-intl; toggle keeps the same look                                                                                                                                                                      |
| 28  | Persistence                     | Cart, language, filters and FAQ state survive reload and sync across tabs                                                                                                                                                                                                                                                                                                         | Zustand `persist` (versioned key, migrations) + `storage` event sync. **The checkout form is not persisted** (personal data, see §7)                                                                                                                  |
| 29  | Reduced motion                  | `prefers-reduced-motion: reduce` kills every animation and transition (`*{animation:none!important;transition:none!important}`); also the JS-driven ones                                                                                                                                                                                                                          | Same global rule, and all JS motion checks a `useReducedMotion()` hook                                                                                                                                                                                |
| 30  | Smooth scroll                   | `html{scroll-behavior:smooth}`; "See combo menus" smooth-scrolls to `#combos` with a 90 px offset; route changes jump to top instantly                                                                                                                                                                                                                                            | Same; `scroll-margin-top` on `#combos`                                                                                                                                                                                                                |

---

## 2. Decisions this plan is built on

| Decision             | Choice                                                                                  | Consequence                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope now            | **Frontend only.** Backend and admin panel come later                                   | Ship the customer site exactly as designed; the cart and checkout behave as in the prototype, behind interfaces the backend plugs into later  |
| Order flow (later)   | Own backend + admin dashboard                                                           | The frontend talks to an `OrderService` interface; today a local implementation, later a Server Action. No component changes when it switches |
| Menu editing (later) | Owner edits from the admin panel                                                        | The frontend reads the menu through a `MenuRepository` interface; today typed files in the repo, later the database/CMS                       |
| Fidelity             | **Pixel-exact, no visual changes**, including the contrast and focus-ring issues in §11 | Every visible change needs explicit sign-off. Accessibility work is limited to things that don't change pixels                                |
| Context              | **Real client, launch ASAP**                                                            | Tight scope; anything not visible in the design waits                                                                                         |

---

## 3. Seams for the backend (built now, used later)

The frontend is built so the backend can be added without touching UI components:

```ts
// src/lib/menu/repository.ts
interface MenuRepository {
  getCategories(): Promise<Category[]>;
  getItems(): Promise<MenuItem[]>;
  getHomeContent(): Promise<HomeContent>; // slides, popular, reviews, timeline, gallery, FAQ
  getSettings(): Promise<SiteSettings>; // ETA, opening hours, WhatsApp number
}
// now:   StaticMenuRepository  → reads src/content/*.ts (data copied verbatim from the design)
// later: CmsMenuRepository     → reads the database / CMS, same types

// src/lib/orders/service.ts
interface OrderService {
  placeOrder(input: OrderInput): Promise<PlacedOrder>; // { ref, etaMinutes, createdAt, totalCents, … }
}
// now:   LocalOrderService    → exactly what the prototype does (validate, KF-1047 ref, local only)
// later: RemoteOrderService   → Server Action, server-side pricing, notifications
```

- Content types use the shapes a CMS would use (localised fields as `{ es, en, ca? }`, integer `priceCents`, `available` flag), so the later migration is a data import, not a refactor.
- Pages are statically generated and read content only through the repository, so switching to a database later means swapping one implementation and adding `revalidateTag`.
- **Recommended backend later:** Payload 3, an open-source CMS that runs inside the same Next.js app and gives the owner an admin at `/admin` with per-field translations (ES/CA/EN), image uploads and access control out of the box. Add Postgres (Neon), a custom live order board, a Telegram/email alert and Resend for customer emails. Estimated +6–9 days when the time comes.

**Placeholder honesty:** until the backend exists, an order placed on the live site goes nowhere, same as the prototype. So either (a) the site launches with checkout active only on preview/staging, or (b) the "Confirmar pedido" button is wired to send the order as a prefilled WhatsApp message to the restaurant as a stopgap (no visual change to the page; the confirmation modal still shows). **Decide before going public** (§11, Q2).

---

## 4. Port strategy: faithful first, clean second

The single biggest risk is visual drift while turning ~900 lines of inline-styled template into components. So the port happens in two separate, test-guarded steps.

### Step 1: mechanical port (faithful by construction)

A one-off **codemod** (Node + `parse5`) reads `design/index.html` and emits JSX:

| Design construct                               | Becomes                                                                                                                                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `style="a:b;c:{{ x }}"`                        | `style={{ a: 'b', c: x }}`                                                                                                                                                                            |
| `style-hover` / `style-active` / `style-focus` | A generated class in `pseudo.css` with the **same `!important` semantics** the runtime uses (`.p12:hover{background:#E63E00!important}`), so inline styles are overridden exactly as in the prototype |
| `<sc-if value>` / `<sc-for list as>`           | `{cond && …}` / `{list.map(…)}` (renders no wrapper element, same as the runtime)                                                                                                                     |
| `<kf-i n s w>`                                 | `<Icon name size stroke>` rendering the same SVG paths (span `inline-flex`, `line-height: 0`, like the web component)                                                                                 |
| `onClick="{{ fn }}"`                           | `onClick={fn}`                                                                                                                                                                                        |
| `renderVals()`                                 | Typed selector functions (`selectHeroVM(state, lang)` etc.) ported line by line                                                                                                                       |
| The `<style>` block                            | `globals.css`, copied verbatim                                                                                                                                                                        |

The output is ugly (inline styles everywhere) but it renders **the same DOM tree with the same computed styles**. That's what makes step 2 safe.

### Step 2: refactor under test

Section by section, move inline styles into CSS Modules + tokens and split components, **keeping the DOM structure unchanged**. The parity test (§6) runs on every commit; a refactor that moves one pixel fails it immediately and names the element.

### Images without changing the DOM

Switching `background-image` divs to `<img>` would change the DOM and break parity. Instead:

- **Content images** stay as `background-image`, but point at AVIF/WebP variants generated at build time by a `sharp` script (static export has no runtime image optimiser), wrapped in CSS `image-set()` for 1×/2×. Same element, same `background-position`, a fraction of the bytes.
- **Hero slide 1** (the LCP element) gets a `<link rel="preload" as="image" imagesrcset>` so it paints as fast as an `<img priority>` would.
- Later, images uploaded through the admin get generated sizes, and the chosen focal point becomes the `background-position`.

---

## 5. Architecture

### 5.1 Stack

| Concern      | Choice                                                                                                                                                                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App          | Next.js (latest stable, App Router), React 19, TypeScript strict, pnpm                                                                                                                                                                                                                                |
| Styling      | Step 1: generated inline styles + `pseudo.css`. Step 2: CSS Modules + `tokens.css` + verbatim `keyframes.css`                                                                                                                                                                                         |
| Fonts        | The exact Google Fonts Inter 400–800 files, self-hosted under the family name `Inter` via `@font-face`. (`next/font` renames the family to a hashed name, which would break the hundreds of inline `font: … 'Inter'` declarations)                                                                    |
| Images       | Build-time `sharp` script → AVIF/WebP variants + `image-set()` on the design's background-image elements (§4)                                                                                                                                                                                         |
| Icons        | `<Icon>` server component, same 66 SVG paths as `kf-icons.js`                                                                                                                                                                                                                                         |
| i18n         | next-intl, `es` at `/` (no prefix), `/ca`, `/en`; UI strings in `messages/*.json`; content localised in `src/content`                                                                                                                                                                                 |
| Client state | Zustand + `persist` (versioned key, `migrate()`), cross-tab sync via `storage` event; checkout form not persisted                                                                                                                                                                                     |
| Forms        | React Hook Form + Zod, same validation rules and messages as the design (schema reused by the backend later)                                                                                                                                                                                          |
| Hosting      | **Your own hosting.** `output: 'export'` + `trailingSlash: true` produces a plain `out/` folder (`/menu/index.html` etc.) that any web server can serve: Apache, Nginx, cPanel, or a Node server. No Vercel-specific features. When the backend arrives it needs a Node host (`output: 'standalone'`) |
| Monitoring   | Sentry (client), Plausible or Umami analytics (cookieless, self-hostable), uptime monitor                                                                                                                                                                                                             |
| Tests        | Vitest, Playwright (behaviour + parity + visual), axe (non-visual checks only)                                                                                                                                                                                                                        |

### 5.2 Routes

```
/  /ca  /en                  Home
/menu  /ca/menu  /en/menu    Menu (?cat=tacos supported, URL-synced)
sitemap.xml  robots.txt  opengraph-image  icon  manifest.webmanifest
```

### 5.3 Content model (typed files now, database later)

```ts
Category { id, name: Localized, icon: IconName, isNew?, sortOrder }
MenuItem {
  id, categoryId, name: Localized, description: Localized, priceCents: number,
  image: string, imagePosition: string, badge?: Localized,
  allergens: AllergenCode[], halal?: boolean, available: boolean, sortOrder
}
HomeContent { slides, popular, reviews, timeline, journey, gallery, faq, marquee }
SiteSettings { etaMinutes: 45, hours: [...], timezone: 'Europe/Madrid', whatsappNumber, mapsUrl }
```

All data is copied verbatim from the design's `Component` class (23 items, 6 categories, 3 languages). Unit tests check that every item has all languages, every image file exists and ids are unique. The prototype's fake `orders` array and other admin leftovers are **not** carried over.

### 5.4 Checkout behaviour (identical to the prototype)

Cart → "Continuar" → 4-field form with the design's validation messages → payment choice → "Confirmar pedido" → `OrderService.placeOrder()` → the design's confirmation modal with ref `KF-1047`, ring animation and live countdown → "Volver al menú" goes to `/menu`. The cart empties, as in the design.

### 5.5 Rendering and caching

- Home and Menu: statically generated per locale (fast from the CDN). When the backend arrives, add on-demand revalidation when the owner saves.
- The "Abierto hoy · 12:30 – 23:30/00:00" pill and the cart total render in client islands (server outputs a fixed-width placeholder), so there's no hydration mismatch and no layout shift. The time is computed in Europe/Madrid.
- One shared rAF scroll loop drives hero parallax, the journey rider and gallery dimming. One `IntersectionObserver` + `MutationObserver` drives reveals. Delegated listeners do the ripple and sweep effects.

### 5.6 Folder structure

```
src/
  app/[locale]/{layout,page}.tsx   app/[locale]/menu/page.tsx
  components/  layout/ home/ menu/ product/ cart/ decor/ effects/  (one folder per section)
  content/     categories.ts items.ts allergens.ts home.ts settings.ts
  lib/         menu/repository.ts orders/service.ts money.ts hours.ts cart-store.ts
               order-schema.ts selectors/*.ts use-reduced-motion.ts use-scrolled.ts
  styles/      tokens.css globals.css keyframes.css pseudo.css
  i18n/  messages/{es,ca,en}.json
scripts/codemod/   the one-off template → JSX converter (kept for reference)
design/            the original export, never edited
tests/  parity/ e2e/ visual/ unit/ fixtures/vendor/ (React 18.3.1, ReactDOM, Babel 7.29.0)
```

---

## 6. Proving it's identical

1. **Deterministic baseline.** The original runs from `design/` with React, ReactDOM and Babel served from `tests/fixtures/vendor/` (same files as unpkg, SRI hashes verified, so no network dependency; unpkg is already blocked in some environments). Time is frozen (`Date.now`, timers) so the "open today" pill and countdown are stable. Fonts and images are awaited.
2. **Structural parity test (primary gate).** Both pages render in the same browser at **360, 390, 414, 768, 1024, 1280, 1440, 1920** and in each state (top, scrolled, menu filtered, search empty, drawer cart/checkout/errors, confirmation, mobile nav, each language). A script walks both DOM trees in document order and compares each element's tag, bounding box (±1 px) and computed `color`, `background-color`, `font-*`, `border-*`, `border-radius`, `box-shadow`, `opacity`, `transform`. The first mismatch is reported as a path (`main > section[2] > article[3] > h3`) with both values. This catches drift that pixel diffs miss and never flakes on anti-aliasing.
3. **Pixel diff (secondary).** Per-section screenshots compared with a realistic threshold, run in one pinned Playwright Docker image so font rendering is identical between runs.
4. **Behaviour tests** for every row of the §1 fidelity contract (slider timing, header switch at 24 px, combo ← → keys, rider position follows scroll, reveal resets on exit, cart persists across reload and tabs, …).
5. **Real devices.** iPhone (Safari) and a mid-range Android (Chrome), recorded side by side with the original for the hero, combos, journey, gallery and how-it-works. Client signs off on the recordings.
6. After sign-off, the port's own screenshots become the baseline, so later changes can't silently alter the look.

---

## 7. Quality bar

**Performance** (measured on a mid-range Android and with 4× CPU throttling, not just on a laptop)

- [ ] LCP < 2.5 s on 4G, CLS < 0.05, INP < 200 ms
- [ ] First-load JS on `/` ≤ 130 KB gzip (the prototype ships React + ReactDOM + Babel standalone ≈ 1.5 MB and compiles in the browser)
- [ ] Images: AVIF/WebP generated at build, lazy below the fold. Decorative vegetables at ~160 px
- [ ] Off-screen infinite animations paused with `animation-play-state` (37 floating images, marquee, steps, journey, FAB pulse, sign). Identical look, much less CPU and battery
- [ ] All pages statically generated; no server work per request

**Accessibility (only what doesn't change pixels, per the fidelity decision)**

- [ ] Drawers/modal: `aria-modal`, focus trap, Esc closes, focus returns to the trigger, background `inert`, scroll lock
- [ ] Payment options as a proper `radiogroup` with arrow keys; form errors linked via `aria-describedby`; first invalid field focused
- [ ] Autoplay sliders pause on hover, focus and hidden tab; gallery items keyboard-reachable; `alt` text via `role="img"` + `aria-label` on background-image elements; skip link (visually hidden)
- [ ] Known, accepted visual issues (contrast, input focus ring) documented in §11, not silently "fixed"

**SEO**

- [ ] Per-locale title and description, `hreflang` + `x-default`, canonical, sitemap, robots
- [ ] JSON-LD: `Restaurant` (address, geo, `openingHoursSpecification` from Settings), `Menu`/`MenuItem` with prices, `FAQPage`
- [ ] OG image via `next/og`; favicon set and manifest

**Security**

- [ ] Security headers (CSP, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`)
- [ ] No secrets in the client; `.env.example` documented; Renovate + `pnpm audit` in CI

**Code health**

- [ ] TypeScript strict, typed content; no `any`
- [ ] Money in integer cents, one `formatPrice()` (keeps the design's `7.90 €` format)
- [ ] Persisted cart store versioned with `migrate()`; cart lines referencing deleted or unavailable items are dropped with a notice
- [ ] Components ≤ ~200 lines after Step 2; ADRs for port-first strategy, parity testing and the backend seams

**CI/CD** (GitHub Actions)

```
PR:   lint · typecheck · unit · build · e2e · parity · visual · Lighthouse (perf/SEO) · bundle size
      → build artifact (`out/`) attached to the PR; optional deploy to your staging host
main: same → deploy `out/` to your hosting (rsync/SFTP/FTP step, credentials in GitHub secrets) → Sentry release
cron: nightly production smoke test (browse, add to cart, open checkout)
```

**Operations**

- [ ] Sentry alerts on client errors; uptime monitor on `/`
- [ ] All accounts (domain, hosting, analytics) **owned by the client**, developer invited
- [ ] Monthly cost shared with the client: hosting $0–20, domain ~€12/year

**Business metrics** (analytics custom events)

- [ ] `menu_view → add_to_cart → checkout_start → order_placed`, average basket, language split

---

## 8. Delivery plan (ASAP, frontend only)

Ranges assume one senior developer. Each phase ends with a pushed, reviewable commit.

| Phase                      | Scope                                                                                                                                                                                                                                                                                                                                                                                       | Days  | Done when                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Foundation**          | Next.js 16 + TS strict scaffold with static export; lint/format/typecheck; CI workflow; design CSS copied verbatim; self-hosted Inter; `<Icon>` (66 icons); all design data and UI strings extracted mechanically into typed content + `messages/{es,ca,en}.json`; assets in `public/` at the same paths; parity harness (vendored React/Babel baseline, frozen clock, DOM-walk comparator) | 1–1.5 | `pnpm build` produces `out/`; unit tests prove the extracted content matches the design exactly; the harness renders the original deterministically |
| **2. Faithful port**       | Codemod template → JSX; selectors ported from `renderVals()`; home, menu, header/footer, drawers, modal; cart store; `MenuRepository` / `OrderService` seams                                                                                                                                                                                                                                | 3–4   | Parity test passes at all viewports, states and languages                                                                                           |
| **3. Behaviour & routing** | Locale routes (switch keeps scroll), `/menu?cat=` in URL, Madrid-time hours, hydration-safe cart, effects providers (reveal, ripple, sweep, scroll loop), sliders, journey, gallery                                                                                                                                                                                                         | 1–1.5 | Behaviour suite (every §1 row) green                                                                                                                |
| **4. Hardening**           | Image variants, off-screen animation pause, non-visual a11y, SEO/JSON-LD, security headers (`.htaccess`/Nginx snippet), Sentry, real-device recordings                                                                                                                                                                                                                                      | 1.5–2 | §7 checklists ticked; client signs off the recordings                                                                                               |
| **5. Launch**              | Deploy `out/` to your hosting, domain/HTTPS, redirects, smoke test                                                                                                                                                                                                                                                                                                                          | 0.5   | Live                                                                                                                                                |
| **6. Refactor**            | Inline styles → CSS Modules + tokens under the parity test (no visible change)                                                                                                                                                                                                                                                                                                              | 3–4   | Code maintainable; parity still green                                                                                                               |
| **7. Backend + admin**     | When you're ready: Payload, Postgres, order board, alerts, emails; Node hosting                                                                                                                                                                                                                                                                                                             | 6–9   | Implementations swapped behind the seams                                                                                                            |

**Total to launch (Phases 1–5): ≈ 7–9 working days.**

Why the refactor waits until after launch: the faithful port is already correct and tested; refactoring first adds days and risk with no visible gain. It is scheduled, not optional, because inline-style code is expensive to maintain.

### i18n routing under static export

There's no middleware in a static export, so routing is built from route groups:

- `app/(es)/…` renders Spanish at `/` and `/menu/` with its own root layout (`<html lang="es">`);
- `app/(intl)/[locale]/…` renders `/ca/…` and `/en/…` (`generateStaticParams` = `ca`, `en`; `dynamicParams = false`).

Both import the same page components; only the locale differs. The language toggle navigates between equivalent URLs without scrolling, and remembers the choice in `localStorage` like the design does.

---

### Phase 1 status: done

Delivered: Next.js 16.3 static-export app, self-hosted Inter, `<Icon>`, design CSS verbatim, content and UI strings extracted by running the design's own code (23 items, 6 categories, 116 strings × 3 languages, proven identical by unit tests), parity harness (deterministic over 5× repeats, catches a 2 px shift and a 1-unit colour change), CI workflow.

What the harness taught us (now part of the fidelity contract):

- The design's runtime injects `html,body{height:100%}` and full-height wrappers; reproduced in `src/styles/runtime-parity.css`.
- The design's inline styles name the font `'Inter'`; `next/font` would rename it, so fonts are self-hosted with `@font-face` under the same name.
- The shine sweep leaves `position: relative; overflow: hidden` on elements it touched (row 6 above).
- Asset URLs must become absolute (`/assets/…`): the design's relative `assets/…` paths would break on `/menu/` and `/ca/`.
- Switching between Spanish (`/`) and `/ca` or `/en` crosses root layouts, so it's a full page load; Phase 3 restores the scroll position.

### Phase 2 status: done

Result: **114/114 Playwright checks pass, twice in a row** (14 states × 8 widths, plus harness and smoke tests). Every element's position, size, text and computed style matches the original design.

How the port works: `scripts/codemod/template-to-jsx.mjs` turns the design's template into `src/legacy/DesignTemplate.tsx`; `src/legacy/KebabApp.tsx` is a line-for-line port of the design's `Component` class (state, effects, view model), mounted once per locale layout by `AppShell`, with the URL selecting home or menu. Differences from the design are listed at the top of `KebabApp.tsx`.

Parity states (each × 8 widths): home, home scrolled, menu (via click and direct load, es and en), tacos filter, empty search, cart drawer, checkout, checkout errors, confirmation modal, mobile nav, home in ca and en.

What the parity test caught in Phase 2 (all fixed, now part of the fidelity contract):

- **The Next.js CSS minifier changes the design's CSS.** It dropped `backdrop-filter` (kept only `-webkit-backdrop-filter`, which Chrome ignores: the glass cards lost their blur) and rewrote values. The design's CSS is now served unprocessed from `public/styles/`.
- **How icons really render.** `<kf-i>` sets `inline-flex` on itself, but for icons in the first render React strips it right after mount, so they sit on the text baseline (a 17 px icon takes 21 px). Icons mounted later keep `inline-flex`. Verified with a mutation observer; `Icon` decides per instance when it mounts.
- **Icon SVGs and page CSS.** The design drew icon SVGs in a shadow root; in the light DOM, `.kf-journey-road svg { position:absolute; width:100% }` would hit the journey's pin and rider icons. The icon SVG carries inline styles that restore the shadow-DOM defaults.
- **The runtime wraps every text value** in `<span class="sc-interp">` and keeps whitespace text nodes that contain a space; the port renders the same nodes, so text wraps and line boxes match.
- **The FAQ chevron never rotates in the design**: the transform is set on an inline element, where transforms don't apply. Reproduced as-is (listed in §11).
- **Reveal flicker (a real design bug, reproduced as-is)**: an element that stops right at the 12 % visibility threshold can loop forever. Its reveal motion (26–36 px) moves it back across the threshold, which resets it, which moves it back again. At 1280 px with ~300 px scrolled, a visitor who stops there sees it pulse. Listed in §11 with a one-line fix (hysteresis, or observing a non-moving wrapper).
- **Harness rules learned**: state flows click via DOM events (a real pointer leaves hover-triggered sweeps on whatever ends up under the cursor, which is timing-dependent; pointer effects get their own behaviour tests); settling waits on conditions with a capped fake-time budget, never fixed sleeps; a state can restrict comparison to the region it exists to check; every test closes its browser contexts (leaking them piled up dozens of renderer processes and was the root cause of the load-dependent failures); the fake clock is installed a minute early so `pauseAt` never targets the past.
- **Hydration**: values that depend on the window or the clock (header overlay on wide screens, "open today" closing time) are computed after mount so server HTML and the first client render agree. Known regression to fix in Phase 3: on wide screens the port's first paint shows the solid header for a moment before it turns transparent over the hero (the design computes this before its first paint). Phase 3 moves the width check into CSS so the server HTML is already right. Same for Friday/Saturday closing time (00:00), which appears after mount.

### Phase 3 status: done

- **Header first paint fixed.** `public/styles/prehydrate.css` applies the overlay header through a media query (≥ 900 px) until the app mounts, then the design's inline styles take over. A parity test compares the port's HTML **with JavaScript disabled** against the design at all 8 widths; with the stylesheet blocked it fails (dark top bar), with it it passes.
- **Language.** Returning visitors who chose Catalan or English are redirected before paint by a tiny inline script on Spanish pages (no flash; crawlers and explicit `/ca/`, `/en/` URLs are never redirected). Switching language restores the scroll position after the reload; cart, filters and slider position carry over through the design's saved state. Open drawers close on a language switch (the design kept them open; it switched in place).
- **Menu filter in the URL.** `/menu/?cat=tacos,pizzas` is kept in sync with the chips without adding history entries; shared links open filtered; back/forward restores the URL's filter.
- **Behaviour suite** (`tests/e2e/behaviour.spec.ts`, 26 tests): hero autoplay (5.5 s, fake clock), dots restart the timer, parallax capped at 60 px, combo autoplay (6 s), arrow keys and buttons, header switch at 24 px, reveal and reset, ripple, hover sweep, cart persistence across reload, checkout validation and confirmation, routing and back navigation, URL filter, language switch keeps scroll and cart, returning-visitor redirect, mobile nav, journey rider follows scroll, gallery centring and dimming, FAQ, smooth scroll to combos, WhatsApp link, reduced motion.
- Known, accepted: on Fridays and Saturdays "Abierto hoy · 12:30 – 00:00" appears after mount (the static HTML says 23:30 until then), because the HTML is built ahead of time.

### Phase 4 status: done

- **Images**: `pnpm images` builds `public/assets` from the design's originals: resized to the largest displayed size (avatars 48 px → 160 px files, vegetables → 320 px), recompressed, plus `.avif`/`.webp` siblings that the server sends by `Accept` header (same URLs, so the markup is unchanged). 4.92 MB → 1.13 MB as AVIF (`salad.png`: 1.17 MB → 43 KB). Decorative `<img>`s lazy-load so they don't compete with the hero; the hero image is preloaded again, as in the design.
- **Hero first paint**: the static HTML now stacks the slides the way the slider's first run does (slide 1 on top), so the hero shows before JavaScript loads. In the design it only appeared after its script ran.
- **Lighthouse (mobile, simulated 4G + 4× CPU)**: home 87 performance (LCP 4.0 s, was 9.7 s; FCP 1.2 s; TBT 60 ms; CLS 0), menu 89; accessibility 96 (only colour contrast, the accepted design palette); best practices 100; SEO 100.
- **Off-screen animations pause** (~50 infinite CSS animations), resuming in view; sliders hold while the tab is hidden.
- **Accessibility layer** (`src/legacy/a11y.ts`, no visual change): modal dialogs with focus moved in and restored, Tab trapped, Esc closes, background inert; payment as a radio group with arrow keys; form errors linked to fields; product photos labelled; gallery operable by keyboard; skip link. Parity ignores only the attributes this layer adds on elements it marks.
- **SEO**: per-locale titles/descriptions, canonical + hreflang (x-default = es), Open Graph/Twitter, JSON-LD (`Restaurant` with opening hours, full `Menu` with prices and halal, `FAQPage`), sitemap, robots, manifest, icons from the design's "KF" tile. Needs the real domain via `SITE_URL`.
- **Security & hosting**: strict per-page CSP (script hashes, no `unsafe-inline` for scripts), verified to produce zero violations and to fail when a hash is removed; `deploy/.htaccess` and `deploy/nginx.conf` with caching, image negotiation, compression and security headers; stylesheets versioned by content hash. See `docs/DEPLOYMENT.md`.
- Not done (needs accounts): Sentry and analytics. Both are a few lines once a DSN / site ID exists.

## 9. Launch checklist

- [ ] Parity + behaviour suites green on the production build; real-device recordings signed off
- [ ] Lighthouse mobile ≥ 90 Performance, 100 SEO, 100 Best Practices (Accessibility will reflect the accepted contrast issues)
- [ ] Checkout decision made: staging-only, or WhatsApp stopgap (§3)
- [ ] Placeholder content replaced (§11 Q1); CI check for placeholder strings (`[certifying body`, `href="#"`) passes
- [ ] Domain, HTTPS, `www` redirect, Search Console + sitemap, Google Business Profile website link
- [ ] Sentry + uptime alerts routed

---

## 10. Risk register

| Risk                                                             | Likelihood     | Impact | Mitigation                                                                  |
| ---------------------------------------------------------------- | -------------- | ------ | --------------------------------------------------------------------------- |
| Visual drift during port                                         | Medium         | High   | Codemod (faithful by construction) + structural parity gate on every commit |
| Customers place orders that go nowhere before the backend exists | High if public | High   | Staging-only checkout or WhatsApp stopgap (§3)                              |
| Animation jank on low-end phones                                 | Medium         | Medium | Off-screen pause, real-device testing                                       |
| Backend later forces UI rework                                   | Low            | Medium | `MenuRepository` / `OrderService` seams and CMS-shaped types from day one   |
| Scope creep before launch                                        | High           | Medium | "Frontend only, exactly as designed" agreed up front                        |

---

## 11. Design issues and decisions needed

Per the pixel-exact decision these ship **as designed**; listed so nobody is surprised later.

- Contrast below WCAG AA: muted text `#8A7160` on cream 4.33:1 and on peach 3.76:1; white on `#FF4D1C` buttons 3.32:1; orange prices 3.32:1; orange kickers on `#FFEEE3` 2.94:1.
- Checkout inputs' focus ring is cream on cream (invisible).
- "Order now" outline button in Find us has a near-invisible border.
- Price format `7.90 €` in every language (kept).
- `<title>`/description are English while the default language is Spanish. Non-visual, so **this will be fixed** with per-locale metadata.
- "Abierto hoy" shows even when the shop is closed. Proposal: same pill, text switches to "Cerrado · abrimos a las 12:30", dot grey. **Needs sign-off.**
- The FAQ promises pickup; checkout has no pickup option (post-launch).
- Reveal-on-scroll flicker: an element that stops right at the visibility threshold pulses forever, because its own reveal motion moves it back and forth across the threshold. Kept as designed; fix is a small hysteresis in the observer (or observing a wrapper that doesn't move).
- The FAQ chevron is meant to rotate when a question opens, but never does (transform on an inline element). Kept as designed; a one-line fix if wanted.

**Questions for the client** (not blocking Phases 1–3):

1. Real content: reviews, the "50.000+" and "92 %" stats, Halal certifier name, Facebook/Instagram/X links, photos of the actual dishes.
2. Until the backend exists: keep checkout on staging only, or send orders as a WhatsApp message to the restaurant?
3. Sign-off on the closed-state pill.
4. Domain name; existing Google Business Profile?
