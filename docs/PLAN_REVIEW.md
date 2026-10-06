# Red-team review of NEXTJS_MIGRATION_PLAN.md (v1)

> **Outcome:** v2 of the plan addresses these findings. Decisions taken after this review: frontend only for now (backend and admin panel later, behind `MenuRepository`/`OrderService` seams), pixel-exact with no visual changes, owner will edit the menu from a future admin panel, real client launching ASAP. Order-flow findings (A1–A3) therefore move to the backend phase; the fidelity-method findings (B1–B6) shape the v2 port strategy.

Each finding: what's wrong, why it matters, what changes in v2. Severity: **S1** would sink the launch or cost the client money, **S2** would cause real rework or a visibly worse product, **S3** worth fixing.

## A. Strategy

**A1 (S1). The plan answers "how do we port the design" but never "how does the restaurant actually take orders".**
v1 jumps straight to a custom Postgres + Server Action + WhatsApp Cloud API backend. Missing questions: does Kebab Factory already sell on Glovo / Just Eat / Uber Eats? Do they have a POS? Who reads incoming orders on a busy Friday night, and on what device? A custom backend with nobody watching it is worse than no backend: orders get lost and customers wait for food that never comes.
*v2:* the order channel is decided first, as an explicit decision with the owner, and the plan branches on it. Zero-backend MVP option: checkout builds a prefilled WhatsApp message to the restaurant (the design already links `wa.me/34683275326`).

**A2 (S1). Cash-on-delivery with no verification invites prank orders.**
Anyone can order 3 family pizzas to a fake address, and the restaurant loses the food and the rider's time. v1 only has Turnstile and rate limiting, which stop bots, not people.
*v2:* the restaurant confirms each order before the countdown starts (an order is "received" until accepted). Optionally verify the phone number, which WhatsApp handoff gets for free.

**A3 (S1). Real-world business rules are missing.** The design (and v1) let you:
- order at 4 a.m.: the "Abierto hoy" pill is always shown, even when closed;
- order to any address: "5 km radius" is promised but never checked;
- see a fixed "45 min" ETA regardless of load.

*v2:* opening hours drive an open/closed state (closed shows a "we open at 12:30" banner, ordering disabled or scheduled). The delivery zone is checked by postcode whitelist (Badalona 08911–08918, Sant Adrià 08930, …, confirmed by the owner). ETA comes from config the owner can change.

**A4 (S2). Who changes a price?** v1 puts the menu in TypeScript files, so every price change, sold-out item or new dish needs a developer and a deploy. For a real restaurant that's a support burden from week one.
*v2:* menu comes from a source the owner can edit (decision below), with typed validation at build/revalidate time.

**A5 (S2). Ownership and running costs were never addressed.**
- Vercel Hobby is non-commercial only; a business site needs Pro (~$20/month) or a host that allows commercial free tiers (Cloudflare Pages, Netlify).
- WhatsApp Cloud API needs Meta Business verification, which can take days to weeks, and has per-conversation fees.
- Domain, email sending and DB all need accounts.

*v2:* a monthly cost table. Every account (domain, hosting, DB, email, Google Business, Search Console) is created in the **client's** name with the developer invited, so the client isn't locked to the developer.

## B. Fidelity method

**B1 (S1). "Hand-port inline styles to CSS Modules" is the biggest drift risk in the whole plan.** The template has ~900 lines with hundreds of inline declarations plus dynamic `{{ }}` values. Rewriting them by hand into class names *and* keeping them identical is two jobs at once, and errors hide in states nobody screenshots (a hover, a 420 px width, Catalan strings that wrap differently).
*v2:* **port first, refactor second.**
1. A codemod converts the template mechanically to JSX: style strings become objects, `style-hover`/`style-active`/`style-focus` become generated CSS classes with the same `!important` semantics the runtime uses, `<sc-if>`/`<sc-for>` become conditionals and maps, `<kf-i>` becomes `<Icon>`. The result is a faithful-by-construction version.
2. Parity tests lock it.
3. Then refactor to CSS Modules + tokens section by section, with the tests proving nothing moved.

**B2 (S2). A pixel diff of ≤ 0.1 % against the original is unrealistic and will be flaky.** Font hinting (Google Fonts CSS vs `next/font`), image recompression (JPEG vs AVIF), and Chromium version differences all produce sub-pixel noise. A threshold that strict will either fail every run or get loosened until it catches nothing.
*v2:* a **layout/computed-style parity test** as the primary gate. For each tagged element, at each viewport, in each state, compare bounding box (±1 px) and key computed styles (colour, font size/weight, radius, shadow, transform) between the original and the port. That's deterministic and points at the exact element that drifted. Pixel diffs stay as a secondary, per-section check with a realistic threshold, run in one pinned Docker image.

**B3 (S2). The baseline depends on unpkg at test time.** It does: unpkg is blocked in this very environment, and CI networks fail too. Babel compiling in the browser also makes timing non-deterministic.
*v2:* vendor React 18.3.1 / ReactDOM / Babel 7.29.0 into `tests/fixtures/` (same SRI hashes, already verified) and route them in Playwright. Freeze `Date.now` (the "open today" pill and countdown depend on time), stub timers, and await fonts and images.

**B4 (S2). URL-based locales change behaviour.** In the design, ES/CA/EN switches instantly in place. With `/ca`, `/en` routes, a switch is a navigation: scroll jumps to the top, reveal animations replay, slider state resets.
*v2:* locale switch uses `router.replace(…, { scroll: false })`. Slider index, scroll position, filter and open drawer are preserved, and a test asserts "switching language keeps scroll position".

**B5 (S2). Time-dependent content in static pages.** "Abierto hoy · 12:30 – 23:30/00:00" depends on the weekday (Madrid time). Rendered at build time it's stale; rendered on the client only, it causes a hydration mismatch.
*v2:* render it in a client island, with server output = neutral placeholder of fixed width (no CLS).

**B6 (S3). Hydration flash on the cart.** The header renders `0.00 €` from the server, then jumps to the restored cart.
*v2:* fixed-width total, rendered after hydration with no layout change.

## C. Quality claims that were wrong

**C1 (S1). "Lighthouse 100 Accessibility" conflicts with "pixel-exact".** Measured contrast from the design's own colours (WCAG AA needs 4.5:1 for normal text):

| Pair | Ratio | Where |
| --- | --- | --- |
| `#8A7160` on `#FFF8F2` | 4.33 | all muted body text on cream: **fail** |
| `#8A7160` on `#FFE4D6` | 3.76 | muted text on peach sections: **fail** |
| `#FFFFFF` on `#FF4D1C` | 3.32 | every "Añadir" button (15 px bold): **fail** |
| `#FF4D1C` on `#FFFFFF` | 3.32 | prices (22 px, weight 600): **fail** |
| `#FF4D1C` on `#FFEEE3` | 2.94 | "Cómo funciona"/"Encuéntranos" kickers: **fail** |

Plus the invisible input focus ring already noted. Fixing these means changing colours slightly (e.g. muted `#8A7160` → `#76604F`, buttons `#FF4D1C` → `#E63E00` for text-bearing fills), which breaks "exactly as it is". This needs an owner decision, not a silent call either way.

**C2 (S2). Placeholder content looks real.** The three reviews (names, quotes, studio-portrait photos), the "50.000+ orders" and "92 %" stats, the Halal certifier placeholder in the FAQ and the `#` social links are all invented or unfinished, but they look final, so they will ship by accident unless someone owns them.
*v2:* a content inventory with an owner and status per item, and a CI check that fails the production build if known placeholder strings (`[certifying body`, `href="#"`) are present.

**C3 (S3). Photos.** Several food photos look like stock/AI images rather than the actual dishes. Real photos of the real food are the single biggest conversion improvement available.
*v2:* budget a half-day food shoot; the image pipeline is built so swapping photos is a file drop.

**C4 (S2). Performance risk is in the design itself, not only the stack.** 37 floating images animate forever, plus `backdrop-filter: blur()` on ~10 elements, plus marquee, journey, steps, FAB pulse and swinging sign all running at once. On a mid-range Android this will drop frames and drain battery. v1's budgets were lab numbers on a fast machine.
*v2:* pause off-screen animations (IntersectionObserver → `animation-play-state`), and test on a real mid-range Android (or CPU-throttled 4×) with a frame budget. The look stays identical; only what's off-screen stops.

## D. Process gaps

**D1 (S2). No discovery step.** v1's open questions sat at the end and were "needed during Phase 5". Order channel, menu editing and photos block architecture decisions, so they belong in Phase 0.
**D2 (S2). No post-launch ownership.** Who fixes it when WhatsApp changes, a dependency has a CVE, or the owner wants a summer menu? *v2:* maintenance plan (monthly Renovate merge, uptime alerts to whom, SLA expectations), and an owner guide.
**D3 (S3). No success metrics.** What does "ship" achieve? *v2:* track menu views → add-to-cart → checkout started → order sent; target conversion and orders/week; compare against current channels (and platform commissions saved, typically 25–35 % on aggregators).
**D4 (S3). Design iteration after handoff.** If the designer keeps editing in Claude Design, how do changes reach the code? *v2:* after the port, the Next.js app is the source of truth; design changes arrive as screenshots/specs per change, never as a re-export.
**D5 (S3). Estimate was one number.** *v2:* ranges per phase, with the order-channel decision as the biggest swing factor.

## E. Things v1 got right (keep)

Server/client split, a shared scroll loop, typed content, integer cents, server-side price calculation, Zod shared schema, the behaviour inventory (§1 of v1 is the strongest part) CI pipeline shape.
