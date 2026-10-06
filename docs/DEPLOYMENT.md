# Deploying Kebab Factory to your hosting

The site is a static export: plain HTML, CSS, JS, fonts and images in `out/`. Any web server can host it; no Node.js is needed on the server.

## 1. Build

Requirements: Node 20.9+ (22 recommended) and pnpm 10 (`corepack enable`).

```bash
pnpm install --frozen-lockfile
SITE_URL=https://www.your-domain.com pnpm build
```

`SITE_URL` is the public address of the site, without a trailing slash. It is written into canonical links, language alternates, the sitemap, robots.txt and the structured data, so it must be the real domain. Without it the build warns and uses a placeholder.

`pnpm build` runs `next build` and then `scripts/postbuild.mjs`, which:

- writes a strict Content Security Policy into every page (exact hashes of that page's inline scripts);
- copies `deploy/.htaccess` into `out/`.

Optional checks before uploading: `pnpm check` (lint, types, unit tests) and `pnpm test:e2e` (parity with the design, behaviour, smoke tests).

## 2. Upload

Upload **the contents of `out/`** (not the folder itself) to the web root, including the hidden `.htaccess` file. Replace the previous files completely: hashed files under `_next/static/` change names between builds, and old ones can be deleted.

| Path                                                                 | What it is                                     | Cached                |
| -------------------------------------------------------------------- | ---------------------------------------------- | --------------------- |
| `index.html`, `menu/`, `ca/`, `en/`, `404.html`                      | Pages                                          | always revalidated    |
| `*.txt` next to pages                                                | Navigation data for in-app page changes        | always revalidated    |
| `_next/static/`                                                      | JavaScript and CSS, content-hashed names       | 1 year                |
| `styles/`                                                            | The design's CSS, linked with `?v=<hash>`      | 1 year                |
| `fonts/`                                                             | Inter (latin, latin-ext)                       | 1 year                |
| `assets/`                                                            | Photos, each with `.avif` and `.webp` siblings | 7 days                |
| `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, icons, `og.jpg` | SEO and sharing                                | revalidated / default |

## 3. Server configuration

Both configurations were tested against the built site on Apache 2.4 and Nginx 1.24: content types, `/menu` → `/menu/` redirects, 404, AVIF/WebP negotiation with `Vary: Accept`, gzip, caching per path, every security header on every path, and a real browser session with zero errors or CSP violations.

### Apache / cPanel / most shared hosting

Nothing to do: `out/.htaccess` is uploaded with the site. It needs `mod_rewrite`, `mod_headers` and `mod_deflate`, which almost every host enables. It:

- serves `photo.jpg.avif` or `.webp` instead of `photo.jpg` to browsers that accept them (same URL, about 75 % smaller);
- sets the caching rules above and gzip compression;
- sends security headers (`nosniff`, `X-Frame-Options`, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`);
- serves `404.html` for unknown URLs.

### Nginx

Use `deploy/nginx.conf` as the server block: set `server_name`, `root` (the uploaded `out/` contents) and the certificate paths, then `nginx -t && systemctl reload nginx`.

### Other hosts (Netlify, Cloudflare Pages, S3 + CDN, …)

Serve `out/` as a static site. The pages work everywhere; to get the same caching, image-format negotiation and headers, translate `deploy/.htaccess` into that host's config (`_headers` file, CDN rules). If the host can't negotiate formats, the original JPEG/PNG files are served, still optimised (2.7 MB in total instead of the design's 4.9 MB).

## 4. HTTPS (do this once the certificate works)

1. Confirm `https://your-domain` loads correctly.
2. In `deploy/.htaccess`, uncomment the HTTPS redirect, and the `Strict-Transport-Security` header. (The Nginx file already has both.)
3. Rebuild and upload, or edit `out/.htaccess` on the server directly.

HSTS tells browsers to refuse plain HTTP for a year, so only enable it once HTTPS is solid.

## 5. After going live

- Check `https://your-domain/`, `/menu/`, `/ca/`, `/en/` and a wrong URL (should show the 404 page).
- Check a photo is served as AVIF: in the browser's network tab, `assets/food/durum.jpg` should have `content-type: image/avif`.
- Submit `https://your-domain/sitemap.xml` in Google Search Console.
- Put the site URL in the Google Business Profile.

## Updating content

Menu items, prices and texts live in `src/content/` and `src/messages/` until the admin panel exists (Phase 7). After editing: `pnpm build`, upload `out/` again. If you change images in `design/assets/`, run `pnpm images` first.
