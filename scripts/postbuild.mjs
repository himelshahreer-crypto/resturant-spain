// Runs after `next build` (static export into out/):
//  1. Content Security Policy per page: hashes every inline <script> in each HTML file and
//     writes a <meta http-equiv="Content-Security-Policy"> as the first element of <head>.
//     Scripts are allowed only from the site itself or by exact hash (no 'unsafe-inline').
//     Inline style *attributes* are how the design is written, so style-src needs 'unsafe-inline'.
//  2. out/.htaccess for Apache / cPanel hosting (same rules as deploy/nginx.conf):
//     modern image formats by Accept header, caching, security headers, 404 page.
// The parts a <meta> CSP can't carry (frame-ancestors) are sent as headers by the server config.
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = "out";

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(p);
    else if (entry.name.endsWith(".html")) yield p;
  }
}

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
const sha256 = (text) => `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;

let pages = 0;
let hashes = 0;
for await (const file of htmlFiles(OUT)) {
  let html = await readFile(file, "utf8");
  html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, ""); // idempotent
  const scriptHashes = new Set();
  for (const [, attrs, body] of html.matchAll(INLINE_SCRIPT)) {
    if (/type="application\/ld\+json"/.test(attrs) || body === "") continue; // data, not executed
    scriptHashes.add(sha256(body));
  }
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${[...scriptHashes].join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  html = html.replace(/<head>/, `<head><meta http-equiv="Content-Security-Policy" content="${csp}"/>`);
  await writeFile(file, html);
  pages++;
  hashes += scriptHashes.size;
}

await copyFile("deploy/.htaccess", join(OUT, ".htaccess"));
console.log(`postbuild: CSP written to ${pages} pages (${hashes} script hashes); .htaccess copied`);
