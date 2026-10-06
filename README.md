# Kebab Factory (Badalona)

Website for Kebab Factory: dürüms, pizza, burgers and fried tacos, delivered in Badalona.
A Next.js 16 port of the Claude Design export in `design/`, built to look and behave exactly like it.

- `design/`: the original design export. The source of truth for look and behaviour; never edited.
- `docs/NEXTJS_MIGRATION_PLAN.md`: the plan, phases and fidelity contract. `docs/PLAN_REVIEW.md`: the review behind it.

## Requirements

Node 20.9+ (22 recommended) and pnpm 10 (`corepack enable`).

## Commands

| Command                                                  | What it does                                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install`                                           | Install dependencies                                                                                                     |
| `pnpm dev`                                               | Dev server on http://localhost:3000                                                                                      |
| `pnpm build`                                             | Static export into `out/`                                                                                                |
| `pnpm start`                                             | Serve `out/` on http://localhost:3000                                                                                    |
| `pnpm check`                                             | Lint + typecheck + unit tests                                                                                            |
| `pnpm test`                                              | Unit tests (content and strings match the design, integrity)                                                             |
| `pnpm test:e2e`                                          | Playwright: parity harness and smoke tests (run `pnpm build` first; first time: `pnpm exec playwright install chromium`) |
| `pnpm format`                                            | Prettier                                                                                                                 |
| `pnpm fonts` / `pnpm gen:icons` / `pnpm extract:content` | Regenerate fonts, icon paths and content from the design                                                                 |

To view the original design next to the port: `node scripts/serve-static.mjs design 4100` (it loads its runtime from unpkg).

## Deploying to your hosting

`pnpm build` writes a plain static site to `out/` (`/index.html`, `/ca/index.html`, `/en/index.html`, assets, fonts).
Upload the contents of `out/` to the web root of any web server (Apache, Nginx, cPanel, or a Node server). No server-side code is needed.
