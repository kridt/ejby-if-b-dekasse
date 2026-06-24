import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ejby IF Bødekasse",
    short_name: "Bødekasse",
    description:
      "Bødekassen for Ejby IF — giv bøder til holdkammerater, betal via MobilePay og følg tavlen.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f7f4",
    theme_color: "#0e4d2a",
    lang: "da",
    categories: ["sports", "lifestyle"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
