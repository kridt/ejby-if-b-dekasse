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
    // Grøn launch-skærm (ingen hvid blink ved koldstart på Android).
    background_color: "#0e4d2a",
    theme_color: "#0e4d2a",
    // TODO (vedligeholder): tilføj screenshots: [{ src, sizes, type, form_factor: "narrow" }]
    // (et Tavle-screenshot) for at låse op for Androids rige install-sheet.
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
