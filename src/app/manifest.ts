import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kebab Factory · Badalona",
    short_name: "Kebab Factory",
    start_url: "/",
    display: "browser",
    background_color: "#FFF8F2",
    theme_color: "#FF4D1C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
