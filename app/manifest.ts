import type { MetadataRoute } from "next";

/** PNG icons are required for reliable “Install app” on Android Chrome; SVG is kept as fallback. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "pantry.ai",
    short_name: "pantry.ai",
    description: "Vision-model pantry tracker. Sort: dying first. Zero waste.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#000000",
    lang: "en",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
