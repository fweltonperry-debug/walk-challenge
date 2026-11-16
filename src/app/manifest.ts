import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StepCash — Walk. Win. Get Paid.",
    short_name: "StepCash",
    description: "35 walkers enter. Most steps wins. Top 3 get paid on Cash App.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B0F0C",
    theme_color: "#00D632",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
