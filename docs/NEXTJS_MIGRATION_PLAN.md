# Kebab Factory: Next.js migration plan

**Source of truth:** `design/index.html` (Claude Design export, "Kebab Factory v3 Hearth")
**Goal:** A production Next.js app that looks and behaves exactly like the design at every breakpoint, including every animation, scroll effect and interaction, and that can be maintained and extended for years.

---

## 0. What we were handed (audit)

### 0.1 Files

| Path | What it is | Used by the page? |
| --- | --- | --- |
| `design/index.html` | The whole site: one `<x-dc>` template (~900 lines of HTML with inline styles), one `<style>` block (~180 rules/keyframes) and one `Component` class (~470 lines of logic and all content in 3 languages) | Yes, this is the design |
| `design/Kebab Factory v3 Hearth.dc.html` | Byte-for-byte copy of `index.html` | Duplicate, ignore |
| `design/support.js` | Claude Design runtime (`dc-runtime`). Loads React 18 + Babel from unpkg at runtime, compiles the template, turns `style-hover="…"` into generated `:hover{…!important}` classes | Prototype only, **not shipped** |
| `design/kf-icons.js` | `<kf-i n s w>` web component: 66 Lucide-style SVG paths in a shadow root | Port to a React `<Icon>` |
| `design/assets/food` (25), `assets/veg` (9), `assets/people` (3) | Photography, 4.1 MB + 276 KB + 680 KB. All 37 files are referenced | Yes |
| `design/_ds/organic-*` | "Organic" design system (Caprasimo/Figtree, terracotta) | **Not used.** The page uses Inter and its own palette. Do not import it |
| `design/uploads/`, `design/scratch/` | Reference screenshots the designer worked from | Reference only |

### 0.2 How the prototype works (and what that means for the port)

- **One component, two "views".** `state.view` switches between `home` and `menu`. In Next.js these become two real routes (`/` and `/menu`), so they are shareable, crawlable and the browser back button works.
- **All styling is inline**, with dynamic values injected via `{{ }}` (e.g. chip background `#FF4D1C` when on). Hover/active/focus states come from `style-hover`/`style-active`/`style-focus`, which the runtime compiles to `:hover` rules with `!important`.
- **All content lives in the JS class**: 6 categories, 23 items, allergens, 4 hero slides, 6 "popular" entries, 3 reviews, 4 timeline stops, 8 gallery images, 7 FAQs and ~110 UI strings, each in `en`/`es`/`ca` via `N(en, es, ca)`. Catalan falls back to Spanish.
- **State is persisted to `localStorage['kf4']`** (cart, language, filters, FAQ open state, *and the checkout form including name/email/phone/address*), and synced across tabs via the `storage` event.
- **Checkout is fake.** `place()` validates, builds an order object, puts it in local state and shows a confirmation saying "We sent a confirmation to …". Nothing is sent anywhere.
- **Leftovers from an admin prototype** are still in the code: a seeded `orders` array with realistic personal data (`Laura Pérez`, `laura.p@gmail.com`, phone numbers, addresses), order statuses `new/preparing/delivered`, an editable `eta`, `parsePrice`, admin icons (`kanban`, `dash`, `chart`…), `JOURNEY_AMBIENT`, `HERO`/`heroDish`, `ddOpen`, the `data-count` counter animation. None of it is rendered on the customer site. It tells us an **owner dashboard was planned** (see Phase 6). The fake personal data must not ship.

### 0.3 Breakpoints in use (must be preserved exactly)

`420`, `480`, `640`, `767/768`, `859/860`, `900`, `960` (media queries) and **container queries** on the home menu grid (`[data-pop]`: 1 col → 2 cols at 460 px → 4 cols at 960 px container width). Fluid sizing everywhere via `clamp()`.

---

## 1. Fidelity contract: every behaviour that must survive

This is the checklist QA signs off against. Every row gets a Playwright test (behaviour) and is in the visual-regression suite (look).

| # | Area | Exact behaviour in the design | How it's built in Next.js |
| --- | --- | --- | --- |
| 1 | Header | Over the hero on ≥900 px, the util bar + header are transparent with white text (`margin-bottom:-149px` overlay). After `scrollY > 24` (or on `/menu`, or <900 px) they turn solid: `rgba(255,248,242,.97)` + `blur(14px)`, util bar `#2C1D12`, all with a `.25s` transition. Language toggle colours follow | `<SiteHeader>` client component; `useScrolled(24)` hook sets `data-overlay` on `<header>`. **Width is handled in CSS media queries, not JS**, so SSR and first paint match (the design reads `innerWidth` in JS, which would cause a hydration flash) |
| 2 | Hero slider | 4 slides, autoplay every 5.5 s (home only). Transition: incoming slide reveals with a `clip-path: circle(0%→150%)` from a per-index origin, 1100 ms `cubic-bezier(.77,0,.18,1)`; outgoing image darkens to `brightness(.6)` over 1000 ms. Each slide has its own Ken Burns loop (`kfkb0/1/2`, 13 s alternate, negative offsets). Optional video per slide (`heroVideos` prop) | `<HeroSlider>` client component, same Web Animations API calls, ported 1:1. Images via `next/image` (`fill`, `priority` on slide 1, `sizes="100vw"`) with `object-position` = the design's `background-position` |
| 3 | Hero controls | Counter `01 / 04`; dots: active dot grows to 44 px and fills with `kffill 5.5s linear`; clicking a dot jumps and restarts the timer. "On the grill now" card shows current slide's item, price, thumbnail (`.42s` bg transition) and an add button | Same component; timer in a `useInterval` that resets on manual navigation |
| 4 | Hero parallax | Background layer `translate3d(0, min(scrollY×0.18, 60px), 0)` | Shared rAF-throttled scroll loop (`useScrollFrame`), one listener for the whole page |
| 5 | Reveal-on-scroll | Every `[data-reveal=n]` animates in (`opacity 0, translateY(26px) scale(.96)` → none, 520 ms, delay `n×45ms`, `cubic-bezier(.2,1.08,.3,1)`) when 12 % visible (`rootMargin 0 0 -60px 0`). **On leaving the viewport it resets** (`translateY(36px) scale(.94)`), so it replays every time. Re-scanned after view/filter/search changes | `<RevealProvider>` with one `IntersectionObserver` plus a `MutationObserver` (picks up new cards after filtering). Elements keep the `data-reveal` attribute so markup stays the same. Content is visible without JS (SEO-safe) |
| 6 | Shine sweep | Cards with `data-wave` get a diagonal shine sweep 280 ms after reveal; any button or `[data-wave]` gets one on hover (1.5 s cooldown per element). Shine colour is chosen from the element's computed background luminance | Ported into `<InteractionEffects>`, one delegated `pointerover` listener, same maths |
| 7 | Ripple | Every `<button>` (except `data-noripple`) gets a white ripple from the pointer position, 480 ms | Same component, one delegated `pointerdown` listener |
| 8 | Marquee | Lime band, list rendered twice, `translateX(-50%)` over 34 s linear, infinite | CSS only, server component |
| 9 | Floating vegetables | 6 decorative layers (37 images: 5 on home, 1 fixed on `/menu`) with `kfbob`/`kfsway` at individual sizes, positions, durations, delays and opacities; the `/menu` layer also carries the faded background photo | `<VegLayer preset="…">` server component; positions kept as data arrays copied verbatim; `aria-hidden`, `loading="lazy"`, tiny `sizes` |
| 10 | Category cards | Hover: card goes `#FF4D1C`, lifts `-4px scale(1.015)`, text white, dot lime; click goes to `/menu?cat=<id>` | CSS module, `<Link>` |
| 11 | Home menu filter | Multi-select chips (All + 6), hover lift, horizontal scroll with fade mask on mobile, wrap on ≥768. Grid uses container queries 1/2/4 cols | Client component, filter state local (home) / in URL (menu) |
| 12 | Product card | Hover lift; Add button turns into a −/qty/+ stepper when in cart; halal + allergen tags; optional badge | `<ProductCard>` (server markup + small client `<AddToCart>` island) |
| 13 | Cart bump | Header cart button scales 1 → 1.12 → 1 (300 ms) on every add | Cart store emits an event; header subscribes |
| 14 | Floating cart | Fixed bottom pill when cart > 0 ("3 View order · 24.30 €"); full-width variant at ≤480 px leaving room for the WhatsApp FAB | Client component |
| 15 | Combos slider | Dark section, background images slide with `translateX`, 650 ms `cubic-bezier(.65,0,.35,1)`; autoplay 6 s; prev/next arrows; dots; **← / → keys** (home only, not while typing); "Add to order" ↔ "Add another" | `<ComboSlider>` client component |
| 16 | How it works | 3 glass cards; a dash of light travels around each card border (`kfBorderTravel` 9 s, staggered 0/3/6 s); icon and number badge pulse in sync; dot travels along the dashed connector (horizontal wave ≥768, vertical line on mobile) | CSS only, copied keyframes |
| 17 | Our story, mobile/tablet (<960) | Vertical road; the rider icon **follows the road based on scroll progress** (`getPointAtLength`) and bobs; 4 timeline cards alternate sides | `<JourneyVertical>` client island using the shared scroll loop |
| 18 | Our story, desktop (≥960) | Curved horizontal road; the rider drives it on an 11.7 s CSS loop, stopping at each pin; cards pop in at 0/3.2/6.4/9.6 s | CSS only |
| 19 | Gallery | Full-bleed scroll-snap carousel; each image's brightness and its label/zoom-icon opacity depend on distance from the centre (updated on horizontal scroll); click centres an item | `<Gallery>` client island |
| 20 | FAQ | Accordion, first item open by default, multiple open allowed, `max-height .3s`, chevron rotates | Client component (`<details>` won't animate the same way, so keep buttons + `aria-expanded`) |
| 21 | FAQ photo grid / Find us | Static grids, gradient overlays, stats; swinging "OPEN / TODAY" sign (`kfswing` 2.6 s) | Server components, CSS |
| 22 | "Open today" pill | Pulsing green dot; closing time 00:00 on Fri/Sat, else 23:30 | Computed in **Europe/Madrid** time, not the visitor's or the server's timezone |
| 23 | WhatsApp FAB | Fixed, green, pulse ring, links to `wa.me/c/34683275326` | Server component |
| 24 | Mobile nav (<860) | Hamburger opens a left drawer with Home/Menu (current page highlighted) and language buttons | Client component, adds focus trap + Esc (see §6) |
| 25 | Cart drawer | Right drawer slides in (320 ms). Steps: empty → cart lines → checkout form (4 fields with inline validation in 3 languages, cash/card radio) → place order | Client component; form via React Hook Form + Zod (same rules) and a Server Action |
| 26 | Confirmation modal | Enters in 380 ms; green ring animates from empty to the remaining-time fraction over 1 s; minutes count down (refresh every 15 s); "Back to the menu" goes to `/menu` | Client component; data comes from the real order response |
| 27 | Language | ES (default) / CA / EN toggle in header and drawer; `<html lang>` updates | Locale in the URL (`/`, `/ca`, `/en`) with next-intl; toggle keeps the same look |
| 28 | Persistence | Cart, language, filters and FAQ state survive reload and sync across tabs | Zustand `persist` (versioned key, migrations) + `storage` event sync. **The checkout form is not persisted** (personal data, see §7) |
| 29 | Reduced motion | `prefers-reduced-motion: reduce` kills every animation and transition (`*{animation:none!important;transition:none!important}`); also the JS-driven ones | Same global rule, and all JS motion checks a `useReducedMotion()` hook |
| 30 | Smooth scroll | `html{scroll-behavior:smooth}`; "See combo menus" smooth-scrolls to `#combos` with a 90 px offset; route changes jump to top instantly | Same; `scroll-margin-top` on `#combos` |

---

## 2. Tech stack (and why)

| Concern | Choice | Reason |
| --- | --- | --- |
| Framework | **Next.js, latest stable, App Router**, React 19, TypeScript `strict` | Server components for the mostly static content, small client islands for the interactive parts |
| Styling | **CSS Modules + one global tokens/keyframes file** | The design is hand-tuned CSS full of `clamp()`, container queries, mask images and 30+ keyframes. Moving it to CSS Modules is close to copy-paste, which is the lowest-risk path to "looks exactly the same". Tailwind would mean translating every value into arbitrary classes, with more room for drift |
| Fonts | `next/font/google` Inter, variable axis 400–800, `display: swap` | Self-hosted, no layout shift, no third-party request |
| Images | `next/image` (AVIF/WebP, responsive `sizes`) | The 15 MB of source photos (e.g. `salad.png` 1.2 MB) shrinks to tens of KB per image. Every `background-image` in the design becomes `<Image fill style={{objectFit:'cover', objectPosition: <same value>}}>` inside the same box, so framing is identical |
| Icons | `<Icon name size stroke>` server component rendering the same 66 SVG paths from `kf-icons.js` | No web component, no shadow DOM, no JS, same pixels |
| i18n | **next-intl**, locales `es` (default, no prefix), `ca`, `en`; messages in JSON | Real URLs per language for SEO, `hreflang`, translations editable without touching components |
| Client state | **Zustand** + `persist` | Small, works outside React (needed for the cart-bump and global effects), simple versioned migrations |
| Forms | React Hook Form + **Zod** (one schema shared by client and server) | Same validation messages as the design, enforced on the server too |
| Orders backend | Next.js **Server Action** → Postgres (Neon or Supabase) via **Drizzle ORM** | Real orders, server-side price calculation, audit trail |
| Notifications | Restaurant: WhatsApp Business Cloud API or Telegram bot (owner's choice), with email fallback. Customer: confirmation email via Resend | The design promises "We sent a confirmation to …", so it has to be true |
| Abuse protection | Upstash rate limit on the order action + Cloudflare Turnstile (invisible) + honeypot field | Public form that triggers real deliveries |
| Content (later) | Typed data files first (`src/content/*.ts`), moved to a CMS or the owner dashboard in Phase 6 | No CMS cost on day one; data shape designed so the move is mechanical |
| Hosting | **Vercel** (preview deploy per PR, edge CDN, image optimisation) | Zero-ops; alternatives: Netlify, or Docker on a VPS via `output: 'standalone'` |
| Analytics | Vercel Web Analytics or Plausible (cookieless) | No cookie banner needed for analytics |
| Errors | Sentry (client + server) | Catch checkout failures in production |
| Tooling | pnpm, ESLint (next + jsx-a11y), Prettier, Stylelint, Husky + lint-staged, Commitlint (conventional commits), Renovate | Standard hygiene |
| Testing | Vitest + Testing Library (logic/components), **Playwright** (e2e + visual regression), axe-core (a11y), Lighthouse CI (performance budgets) | See §5 |

---

## 3. Target architecture

### 3.1 Routes

```
/                 Home (es)          /ca, /en           Home (ca, en)
/menu             Menu (es)          /ca/menu, /en/menu
/menu?cat=tacos   Menu, filtered (the "Fried Tacos are here" button and category cards link here)
/legal/aviso-legal, /legal/privacidad, /legal/cookies     (new, required in Spain, see §7)
/api/health       uptime check
sitemap.xml, robots.txt, opengraph-image, icon/apple-icon, manifest.webmanifest
```

`not-found.tsx` and `error.tsx` styled with the design's tokens.

### 3.2 Folder structure

```
src/
  app/
    [locale]/
      layout.tsx            html lang, fonts, header, footer, WhatsApp FAB, providers
      page.tsx              Home (server component, composes sections)
      menu/page.tsx         Menu
      legal/[slug]/page.tsx
    actions/place-order.ts  Server Action
    sitemap.ts  robots.ts  opengraph-image.tsx  manifest.ts
  components/
    layout/      UtilBar, SiteHeader, LangSwitch, MobileNav, SiteFooter, WhatsAppFab
    home/        Hero, HeroSlider, Marquee, CategoryGrid, HomeMenu, ComboSlider,
                 PopularGrid, HowItWorks, Reviews, Journey (Vertical, Horizontal),
                 Gallery, Faq, FaqPhotoGrid, FindUs
    menu/        MenuHeader, CategoryChips, MenuSearch, MenuSection, NoResults
    product/     ProductCard, PopularCard, AddToCart (stepper), Tags
    cart/        CartButton, FloatingCart, CartDrawer, CartLines, CheckoutForm,
                 PaymentOptions, OrderConfirmation
    decor/       VegLayer, Icon
    effects/     RevealProvider, InteractionEffects (ripple + sweep), ScrollFrameProvider
  content/       categories.ts, items.ts, allergens.ts, slides.ts, popular.ts,
                 reviews.ts, timeline.ts, gallery.ts, faq.ts, veg-layouts.ts, site.ts
  i18n/          routing.ts, request.ts   messages/{es,ca,en}.json
  lib/           money.ts, hours.ts (Europe/Madrid), cart-store.ts, order-schema.ts,
                 use-reduced-motion.ts, use-scrolled.ts, use-interval.ts
  server/        db/schema.ts, db/client.ts, notify/{whatsapp,email}.ts, rate-limit.ts
  styles/        tokens.css, globals.css, keyframes.css
design/          original export, never edited (used by visual tests)
tests/           e2e/, visual/, unit/
```

### 3.3 Server vs client split

- **Server components (zero JS):** UtilBar, Marquee, CategoryGrid, PopularGrid markup, HowItWorks, Reviews, JourneyHorizontal, FaqPhotoGrid, FindUs, VegLayer, Icon, Footer, WhatsAppFab, MenuSection markup.
- **Client islands:** SiteHeader (scroll state), MobileNav, HeroSlider, HomeMenu filter, ComboSlider, JourneyVertical (scroll-linked rider), Gallery, Faq, AddToCart, CartButton, FloatingCart, CartDrawer, OrderConfirmation, RevealProvider, InteractionEffects, ScrollFrameProvider.
- **One shared rAF scroll loop** feeds the hero parallax, the journey rider and the gallery. The design attaches three scroll listeners (window, resize, document capture), so this is the same behaviour with less work per frame.

### 3.4 Design tokens (extracted from the inline styles)

```css
:root {
  --kf-orange: #FF4D1C;     --kf-orange-600: #E63E00;  --kf-orange-700: #B83A00;
  --kf-lime: #C6FF3D;       --kf-lime-soft: #D9FF6B;
  --kf-ink: #2C1D12;        --kf-ink-950: #1B120C;     --kf-ink-combos: #1C130D;
  --kf-cream: #FFF8F2;      --kf-peach-50: #FFEEE3;    --kf-peach-100: #FFE4D6;
  --kf-peach-200: #FCE0CC;  --kf-peach-300: #FFDCC0;   --kf-muted: #8A7160;
  --kf-green: #2E6B4C;      --kf-green-50: #E7F0E8;    --kf-error: #D6362A;
  --kf-star: #FFC107;       --kf-whatsapp: #25D366;
  --kf-radius-sm: 10px; --kf-radius-md: 14px; --kf-radius-lg: 18px; --kf-radius-pill: 999px;
  --kf-container: 1240px;   --kf-gutter: clamp(18px, 4vw, 40px);
  --kf-section-y: clamp(64px, 8vw, 104px);
  --kf-shadow-card: 0 8px 24px -8px rgba(80,40,10,.18);
  --kf-ease-reveal: cubic-bezier(.2,1.08,.3,1);
}
```

Hex values are taken as-is from the design. We name them; we don't change them.

### 3.5 Data model (content + orders)

```ts
type Locale = 'es' | 'ca' | 'en';
type Localized = Record<'es' | 'en', string> & { ca?: string };   // ca falls back to es, as in the design

interface Category { id: string; name: Localized; icon: IconName; isNew?: boolean; sort: number }
interface MenuItem {
  id: string; categoryId: string; name: Localized; description: Localized;
  priceCents: number;                 // integers, the design uses floats (7.9)
  image: string; imagePosition: string; badge?: Localized;
  allergens: AllergenCode[]; halal?: boolean; available: boolean; sort: number;
}
// DB: orders(id, ref 'KF-1047', status, created_at, eta_min, customer_name, email, phone,
//     address, payment 'cash'|'card', total_cents, locale)  order_lines(order_id, item_id, name_snapshot, qty, unit_cents)
```

The server never trusts client prices. It recalculates the total from `item_id × qty` before saving.

---

## 4. Delivery plan (phases, each ends with a reviewable PR and a preview URL)

| Phase | Scope | Definition of done |
| --- | --- | --- |
| **0. Foundation** (≈1 day) | Scaffold Next.js + TS strict, pnpm, ESLint/Prettier/Stylelint, Husky, CI pipeline, Vercel project, `design/` served locally at `/__design` for side-by-side comparison (dev only), Playwright set up with the baseline screenshot harness | CI green on an empty app; `pnpm dev` shows both the original and the new app |
| **1. Tokens, primitives, layout** (≈2 days) | `tokens.css`, `keyframes.css` (all 30+ keyframes copied verbatim), Inter via next/font, `<Icon>` (66 icons), UtilBar, SiteHeader (overlay/solid logic), LangSwitch, MobileNav, Footer, WhatsApp FAB, i18n routing + all strings moved to `messages/*.json` | Header/footer pixel-match at all breakpoints; language switching works |
| **2. Content layer** (≈1 day) | All data from the `Component` class moved into typed `src/content/*` files with unit tests (every item has 3 languages, every image exists, ids are unique). Admin seed data dropped | Tests pass; no personal data in the bundle |
| **3. Home, static sections** (≈3 days) | Hero layout, Marquee, CategoryGrid, PopularGrid, HowItWorks, Reviews, Journey (both), FAQ photo grid, Find us, VegLayers | Visual diff within threshold for each section |
| **4. Motion and interaction** (≈3 days) | RevealProvider, InteractionEffects (ripple, sweep), ScrollFrameProvider, HeroSlider, ComboSlider, Gallery, JourneyVertical rider, FAQ accordion, reduced-motion handling | Every row of §1 has a passing Playwright behaviour test; manual sign-off on a real phone (iOS Safari + Android Chrome) |
| **5. Menu page + cart + checkout** (≈4 days) | `/menu` with URL-synced category filter and search, HomeMenu filter, AddToCart, cart store with persistence/migration/tab sync, CartDrawer, CheckoutForm, Server Action, DB, notifications, rate limit, confirmation modal with the real order | A test order placed on the preview reaches the restaurant's phone and the customer's inbox |
| **6. Hardening and launch** (≈2 days) | SEO (metadata, JSON-LD, sitemap, OG image), legal pages, a11y fixes, Lighthouse budgets, Sentry, security headers, 404/500 pages, domain + HTTPS, uptime monitor | Launch checklist (§8) all ticked |
| **7. After launch** | Owner dashboard (orders board new → preparing → delivered, edit ETA, toggle item availability, edit prices) behind auth. The prototype already sketched this. Optionally a CMS, online card payments (Stripe/Redsys), pickup option in checkout (the FAQ already promises it) | Separate roadmap |

Estimate: **about 3 weeks for one senior developer** to production launch (Phases 0–6).

---

## 5. Pixel-exact verification strategy

"Keep it exactly as it is" has to be measured, not eyeballed.

1. **The original is the baseline.** `design/` stays in the repo untouched. A Playwright project serves it (it needs network access for the unpkg React/Babel the runtime loads) and screenshots it.
2. **Same screenshots of the Next.js build**, same pages and states:
   - Viewports: **360, 390, 414, 768, 1024, 1280, 1440, 1920** wide (covers every breakpoint in §0.3)
   - States: home top, home scrolled (header solid), each section, menu (all / tacos filter / search with no results), cart drawer (empty, with items, checkout with validation errors), confirmation modal, mobile nav open, each language.
   - Animations frozen (`reducedMotion: 'reduce'`, autoplay timers stubbed, fonts awaited) so the pixels are stable.
3. **Diff with `pixelmatch`**: threshold ≤ 0.1 % differing pixels per screenshot. Anything above that fails CI and has to be fixed or explicitly approved.
4. **Motion is checked with behaviour tests**, not pixels: e.g. "after 5.5 s slide 2 is active", "header gets `data-overlay=false` after scrolling 25 px", "← key moves the combo slider", "the rider's `top` increases as the journey scrolls", "reveal elements reset when they leave the viewport".
5. **Manual motion review**: screen recordings of old and new side by side for the hero, combos, journey, gallery and how-it-works, signed off by the designer/owner.
6. Once the port is approved, the Next.js screenshots become the new baseline, so future PRs can't regress the look without anyone noticing.

---

## 6. Quality checklists

### 6.1 Performance (budgets enforced in Lighthouse CI on mobile profile)

- [ ] LCP < 2.5 s (hero slide 1 with `priority`, preloaded, AVIF), CLS < 0.05, INP < 200 ms, TBT < 200 ms
- [ ] First-load JS on `/` ≤ 120 KB gzip. The prototype downloads React + ReactDOM + **Babel standalone** (~1.5 MB) and compiles the template in the browser; none of that ships
- [ ] Hero slides 2–4 and the combo backgrounds load lazily after first paint
- [ ] Veg decorations: `loading="lazy"`, `sizes` ≈ 160 px, decoded off the main thread
- [ ] Only `transform`/`opacity`/`clip-path` animated. The desktop journey rider animates `left/top` in the design; keep the look but evaluate converting it to `offset-path` or transforms if it janks on low-end devices
- [ ] Pause off-screen CSS loops (`animation-play-state` via IntersectionObserver) to save battery on mobile, with no visual change
- [ ] Static generation (SSG) for all pages × 3 locales; ISR when content moves to a CMS

### 6.2 Accessibility (WCAG 2.2 AA)

Keep the visuals, fix the semantics:

- [ ] Drawers and modal: `aria-modal="true"`, focus trap, **Esc closes**, focus returns to the trigger, background `inert`, body scroll lock (none of these exist in the prototype)
- [ ] Payment options: wrap in `role="radiogroup"` with a label, arrow-key navigation
- [ ] Form errors linked with `aria-describedby`, `aria-invalid`; focus the first invalid field on submit
- [ ] Hero and combo autoplay: pause on hover/focus and when the tab is hidden (WCAG 2.2.2 requires a way to pause content that moves for more than 5 s; the dots can double as the control)
- [ ] Gallery items reachable by keyboard (`button` or `tabindex`), real `alt` text for every content image (the design uses CSS backgrounds with no alt)
- [ ] Decorative layers `aria-hidden` (already so in the design), icons `aria-hidden`, icon-only buttons labelled (already so)
- [ ] Heading order check (the home page uses `h3` for product names inside sections that only have `h2` titles, which is fine; the menu page should keep a single `h1`)
- [ ] Colour contrast audit with axe; see design questions in §9
- [ ] Skip-to-content link (visually hidden until focused)

### 6.3 SEO and local SEO

- [ ] Per-locale `<title>`/description (the design's `<title>` and description are English while the default language is Spanish; write proper ES/CA/EN versions)
- [ ] `hreflang` alternates + `x-default`, canonical URLs, `sitemap.xml`, `robots.txt`
- [ ] JSON-LD: `Restaurant` (name, address in Badalona, geo, `openingHoursSpecification` 12:30–23:30 Sun–Thu / 12:30–00:00 Fri–Sat, `servesCuisine`, `priceRange`, `acceptsReservations: false`, `hasMenu`), `Menu`/`MenuItem` with prices, `FAQPage` for the FAQ
- [ ] Open Graph / Twitter image generated with `next/og` in the brand style
- [ ] Favicon set + web manifest (KF orange tile)
- [ ] Google Business Profile linked (the Maps link is already in the design)

### 6.4 Security

- [ ] Strict security headers: CSP (self + Vercel analytics + Turnstile only), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`
- [ ] Zod validation on the server for every order field, length limits, phone normalisation
- [ ] Rate limiting per IP + Turnstile + honeypot on the order action
- [ ] Secrets only in Vercel env vars; `.env.example` documents them; nothing secret in the client bundle
- [ ] Dependency scanning (Renovate + `pnpm audit` in CI), GitHub secret scanning on

### 6.5 Code quality and maintainability

- [ ] TypeScript strict, no `any`; content types make an invalid menu item a compile error
- [ ] No inline style objects except genuinely dynamic values (e.g. a CSS variable for the slide index); everything else in CSS Modules using tokens
- [ ] Each section component < ~200 lines, colocated `*.module.css`
- [ ] Money as integer cents everywhere, formatted in one `formatPrice()`
- [ ] Persisted store has a version number and a `migrate()` so a future change to the cart shape doesn't break returning visitors
- [ ] `README` (setup, scripts, env vars, how to edit the menu, how to add a language), `CONTRIBUTING`, ADRs for the main decisions (CSS Modules over Tailwind, next-intl, Zustand, the DB choice)
- [ ] PR template + CODEOWNERS; branch protection on `main` requiring CI

### 6.6 CI/CD (GitHub Actions)

```
on PR:  install (cache) → lint (eslint, stylelint, prettier --check) → typecheck → unit tests
        → build → e2e + a11y (axe) → visual regression → Lighthouse CI → bundle-size report
        + Vercel preview deployment comment
on main: same + production deploy, Sentry release with source maps
nightly: Playwright smoke test against production (place a test order flagged as test)
```

### 6.7 Observability and operations

- [ ] Sentry errors + performance; alert on any failed order action
- [ ] Uptime monitor on `/` and `/api/health` (Better Stack / UptimeRobot)
- [ ] Order notification failure → retry + fallback channel, so an order is never silently lost
- [ ] Daily DB backups (Neon/Supabase built-in), documented restore

---

## 7. Spain/EU compliance (needed before launch, confirm with the owner and their advisor)

- [ ] **Aviso legal** (LSSI-CE): business name, NIF/CIF, registered address, contact email. Currently missing
- [ ] **Política de privacidad** (RGPD/LOPDGDD): what the order form collects, why, how long it's kept, rights, data controller. Link it next to the "Place order" button
- [ ] **Cookies**: if we stay cookieless (Plausible/Vercel analytics) and only use `localStorage` for the cart, a cookie banner isn't needed; we still need a cookie/storage policy page. Stop storing the customer's name/email/phone/address in `localStorage` (the prototype does)
- [ ] **Allergens** (EU Reg. 1169/2011): info must be available before purchase. The design shows tags for gluten/dairy/egg/sesame plus a "please tell us" note; the owner must confirm the data for all 14 regulated allergens per dish
- [ ] **Halal claim**: the FAQ literally says "certified by [certifying body — pending confirmation]". Content blocker: get the certifier's name or remove the claim
- [ ] **Reviews**: "5.0 out of 5 · 3 verified reviews" with named reviewers and photos. EU consumer rules (Omnibus Directive) require "verified" claims to be backed by a real verification process. Use real reviews (e.g. pulled from Google) with consent, or drop "verified"
- [ ] **Stats** "50.000+ orders delivered" and "92 % customers who come back" must be real figures
- [ ] Prices shown include IVA, say so once (footer or menu)

---

## 8. Launch checklist

- [ ] All §1 behaviours pass; visual diff approved at all 8 viewports × 3 languages
- [ ] Lighthouse mobile ≥ 95 Performance, 100 Accessibility, 100 Best Practices, 100 SEO
- [ ] Real test order end-to-end on production (restaurant notified, customer email received)
- [ ] Legal pages live and linked from the footer
- [ ] Placeholder content replaced: social links (`href="#"` for Facebook and Twitter), Halal certifier, reviews, stats
- [ ] Domain, HTTPS, `www` → apex redirect, Google Search Console + sitemap submitted, Business Profile website URL updated
- [ ] Sentry + uptime alerts going to the owner/dev
- [ ] Owner handover doc: how orders arrive, what to do if notifications stop

---

## 9. Design issues found (keep as-is by default, raise with the designer)

These are in the export as delivered. The plan is to reproduce them exactly unless the owner says otherwise. Each is a one-line change.

1. **Invisible focus state on checkout inputs**: `style-focus="border-color:#FFF8F2;box-shadow:0 0 0 2px #FFF8F2,0 0 0 4px #FFF8F2"` is cream on a cream background, so the focus ring disappears. Probably meant `#FF4D1C`. Accessibility fail, **recommend fixing**.
2. **"Order now" outline button in Find us**: `border:2px solid #FFF8F2` on a `#FFEEE3` background is nearly invisible. Its hover is `#FF4D1C` with dark text.
3. **Header cart button**: outer button and inner icon tile are both `#FF4D1C`, and the total text is dark (`#2C1D12`) while every other orange button uses white text. The cart stepper on cards also mixes dark and white.
4. **Price format**: `7.90 €` (dot) in every language. Spanish/Catalan convention is `7,90 €`. Recommend `Intl.NumberFormat` per locale.
5. **`<title>` and meta description are English** while the default language is Spanish.
6. **Social links** for Facebook and Twitter point to `#`. Twitter's icon/name may need to become X.
7. **The FAQ promises pickup** ("let us know when ordering") but checkout has no pickup option and always asks for an address.
8. **Unused design system**: `_ds/organic` (Caprasimo, terracotta) isn't used by the page; confirm Inter + the orange palette is final.

---

## 10. Questions for the owner (needed during Phase 5–6)

1. Where should new orders arrive: WhatsApp (number 34683275326?), Telegram, email, or a tablet dashboard?
2. Legal entity details for the Aviso legal (business name, NIF, address, contact email).
3. Halal certifier name; confirmed allergen list per dish.
4. Real reviews and statistics, or should we remove them?
5. Real Facebook/Instagram/X links.
6. Domain name, and is there an existing Google Business Profile?
7. Should Catalan be fully translated (currently some strings fall back to Spanish)?
8. Fix the design issues in §9 now, or reproduce exactly first and fix in a follow-up?
