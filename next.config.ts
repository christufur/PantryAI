import type { NextConfig } from "next";

// LAN IP in the browser must be allowlisted or dev `/_next/*` requests get 403.
const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.*.*.*",
    "172.*.*.*",
    "192.168.*.*",
    "169.254.*.*",
  ],
};

export default nextConfig;
