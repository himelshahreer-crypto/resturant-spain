// Generates the favicon set and the social-sharing image (public/icon*.png, icon.svg, og.jpg).
// The icon reproduces the design's "KF" logo tile (orange #FF4D1C, white Inter 600, radius 10/44).
// Run: pnpm brand
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const tile = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 44 44">
  <rect width="44" height="44" rx="10" fill="#FF4D1C"/>
  <text x="22" y="28.2" text-anchor="middle" font-family="Inter, 'Segoe UI', system-ui, Arial, sans-serif" font-weight="600" font-size="16" letter-spacing="-0.32" fill="#ffffff">KF</text>
</svg>`;

await writeFile("public/icon.svg", tile(44));
for (const [name, size] of [
  ["icon-32.png", 32],
  ["apple-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
]) {
  await sharp(Buffer.from(tile(size)))
    .png()
    .toFile(`public/${name}`);
}
// Social card: the hero burger, framed like the design's hero (background-position 28% 50%).
await sharp("design/assets/food/burger-house.jpg")
  .resize(1200, 630, { fit: "cover", position: "left" })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile("public/og.jpg");
console.log("brand images written");
