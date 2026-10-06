import type { BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const nm = (p: string) => join(process.cwd(), "node_modules", p);

/**
 * The original design loads React 18.3.1, ReactDOM 18.3.1 and Babel 7.29.0
 * from unpkg (with SRI). We serve the identical files from node_modules so the
 * baseline needs no network and is deterministic. The SRI check still runs in
 * the browser, so a mismatched file would fail loudly.
 */
const VENDOR: Record<string, string> = {
  "react.production.min.js": nm("react18-umd/umd/react.production.min.js"),
  "react-dom.production.min.js": nm("react-dom18-umd/umd/react-dom.production.min.js"),
  "babel.min.js": nm("@babel/standalone/babel.min.js"),
};

export async function routeDesignRuntime(context: BrowserContext) {
  await context.route("https://unpkg.com/**", (route) => {
    const url = route.request().url();
    const file = Object.entries(VENDOR).find(([name]) => url.endsWith(name))?.[1];
    if (!file) return route.abort();
    return route.fulfill({
      path: file,
      contentType: "text/javascript",
      headers: { "access-control-allow-origin": "*" },
    });
  });
}

/**
 * The design requests Inter from Google Fonts. Serve the same files we
 * self-host (scripts/fetch-fonts.mjs downloaded them from that exact URL),
 * so baseline and port render with identical font binaries, offline.
 */
export async function routeDesignFonts(context: BrowserContext) {
  const css = readFileSync(join(process.cwd(), "src/styles/fonts.css"), "utf8").replaceAll(
    "/fonts/",
    "https://fonts.gstatic.com/kf/",
  );
  await context.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ body: css, contentType: "text/css", headers: { "access-control-allow-origin": "*" } }),
  );
  await context.route("https://fonts.gstatic.com/kf/**", (route) =>
    route.fulfill({
      path: join(process.cwd(), "public/fonts", route.request().url().split("/").pop()!),
      contentType: "font/woff2",
      headers: { "access-control-allow-origin": "*" },
    }),
  );
}

export async function prepareDesignContext(context: BrowserContext) {
  await routeDesignRuntime(context);
  await routeDesignFonts(context);
}
