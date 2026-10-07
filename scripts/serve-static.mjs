// Minimal static file server for tests: node scripts/serve-static.mjs <dir> <port>
// Serves <dir>/path, <dir>/path/index.html, and 404.html for misses.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const [dir = "out", port = "4200"] = process.argv.slice(2);
const root = resolve(dir);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

async function find(p) {
  for (const c of [p, join(p, "index.html")]) {
    try {
      if ((await stat(c)).isFile()) return c;
    } catch {}
  }
  return null;
}

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const target = normalize(join(root, url));
  if (!target.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  let file = await find(target);
  // Mirror the production rules (deploy/.htaccess, nginx.conf): modern image formats by Accept.
  let vary = false;
  if (file && /\/assets\/.+\.(jpe?g|png)$/.test(file)) {
    vary = true;
    const accept = req.headers.accept || "";
    for (const ext of ["avif", "webp"]) {
      if (accept.includes(`image/${ext}`) && (await find(`${file}.${ext}`))) {
        file = `${file}.${ext}`;
        break;
      }
    }
  }
  if (!file) {
    const nf = await find(join(root, "404.html"));
    res.writeHead(404, { "content-type": TYPES[".html"] }).end(nf ? await readFile(nf) : "Not found");
    return;
  }
  const type = TYPES[extname(file)] || "application/octet-stream";
  let body = await readFile(file);
  // Compress text like the production server does (deploy/.htaccess mod_deflate, nginx gzip).
  const gzip =
    /^(text\/|application\/(json|javascript)|image\/svg)/.test(type) &&
    /gzip/.test(req.headers["accept-encoding"] || "");
  if (gzip) body = gzipSync(body);
  res.writeHead(200, {
    "content-type": type,
    "cache-control": "no-store",
    ...(vary ? { vary: "Accept" } : {}),
    ...(gzip ? { "content-encoding": "gzip" } : {}),
  });
  res.end(body);
}).listen(Number(port), () => console.log(`serving ${root} on http://localhost:${port}`));
