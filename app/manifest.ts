import type { MetadataRoute } from "next";

/**
 * Android: use **Install app** (or our in-app Install prompt). “Add to Home screen”
 * from the menu often creates a shortcut that still opens inside Chrome with the URL bar.
 * `display_override` + SW + icons make the installed/WebAPK experience fullscreen/standalone.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "pantry.ai",
    short_name: "pantry.ai",
    description: "Vision-model pantry tracker. Sort: dying first. Zero waste.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    /** Prefer immersive app window on Android; fall back to standalone then minimal chrome. */
    display_override: ["fullscreen", "standalone", "minimal-ui"],
    launch_handler: {
      client_mode: "focus-existing",
    },
    prefer_related_applications: false,
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#000000",
    lang: "en",
    categories: ["food", "lifestyle"],
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
