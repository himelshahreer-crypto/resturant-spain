// Builds the site's images from the design's originals (design/assets, never modified):
//  - resized to the largest size the design ever displays them at (×2–3 for sharp screens),
//  - JPEGs recompressed (mozjpeg, progressive), PNGs recompressed losslessly,
//  - plus `.webp` and `.avif` siblings (e.g. salad.png.avif), which the web server serves to
//    browsers that accept them (see deploy/ .htaccess and nginx rules). URLs don't change, so
//    the markup stays identical to the design.
// Writes public/assets/**. Run: pnpm images
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC = "design/assets";
const OUT = "public/assets";

/** Max width per folder: the largest rendered size in the design × device pixel ratio. */
const MAX_WIDTH = {
  food: 1920, // hero, combos and gallery backgrounds are full-bleed
  veg: 320, // decorations render at ≤ 160 px
  people: 160, // reviewer avatars render at 48 px
};

let before = 0;
let after = 0;
let modern = 0;
for (const dir of Object.keys(MAX_WIDTH)) {
  await mkdir(join(OUT, dir), { recursive: true });
  for (const file of await readdir(join(SRC, dir))) {
    const src = join(SRC, dir, file);
    const dst = join(OUT, dir, file);
    const meta = await sharp(src).metadata();
    const resize = { width: Math.min(meta.width, MAX_WIDTH[dir]), withoutEnlargement: true };
    const base = () => sharp(src).rotate().resize(resize);
    const main =
      meta.format === "png"
        ? await base().png({ compressionLevel: 9, effort: 10 }).toBuffer()
        : await base().jpeg({ quality: 82, mozjpeg: true, progressive: true }).toBuffer();
    const webp = await base().webp({ quality: 80, effort: 6 }).toBuffer();
    const avif = await base().avif({ quality: 55, effort: 6 }).toBuffer();
    // Never ship a "fallback" larger than the original.
    const orig = (await stat(src)).size;
    const fallback = main.length < orig || resize.width < meta.width ? main : await sharp(src).toBuffer();
    await writeFile(dst, fallback);
    await writeFile(`${dst}.webp`, webp);
    await writeFile(`${dst}.avif`, avif);
    before += orig;
    after += fallback.length;
    modern += avif.length;
  }
}
const mb = (n) => (n / 1024 / 1024).toFixed(2) + " MB";
console.log(`originals ${mb(before)} → fallback ${mb(after)}, avif ${mb(modern)}`);
