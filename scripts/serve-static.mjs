// Minimal static file server for tests: node scripts/serve-static.mjs <dir> <port>
// Serves <dir>/path, <dir>/path/index.html, and 404.html for misses.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

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
  const file = await find(target);
  if (!file) {
    const nf = await find(join(root, "404.html"));
    res.writeHead(404, { "content-type": TYPES[".html"] }).end(nf ? await readFile(nf) : "Not found");
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] || "application/octet-stream",
    "cache-control": "no-store",
  });
  res.end(await readFile(file));
}).listen(Number(port), () => console.log(`serving ${root} on http://localhost:${port}`));
