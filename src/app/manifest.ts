import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Staffroom Intel",
    short_name: "Staffroom",
    description: "Honest salary intelligence & compensation benchmarks for international school teachers.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090f",
    theme_color: "#07090f",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
