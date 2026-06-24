import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// iOS launch-splash pr. enhed (device-px-filer i /public/splash).
const splashDevices: Array<[number, number, number]> = [
  [440, 956, 3], [430, 932, 3], [402, 874, 3], [393, 852, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [375, 667, 2],
  [1024, 1366, 2], [834, 1194, 2], [820, 1180, 2], [810, 1080, 2], [768, 1024, 2],
];
const APPLE_SPLASH = splashDevices.map(([w, h, dpr]) => ({
  url: `/splash/apple-splash-${w * dpr}x${h * dpr}.png`,
  media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
}));

export const metadata: Metadata = {
  title: "Ejby IF Bødekasse",
  description: "Bødekassen for Ejby IF — giv bøder, betal og se tavlen.",
  applicationName: "Ejby Bødekasse",
  appleWebApp: {
    capable: true,
    // Gennemsigtig statuslinje på iOS, så den grønne crest-bjælke fylder hele
    // safe-area-toppen (statuslinjeteksten holdes læsbar mod den grønne bjælke).
    statusBarStyle: "black-translucent",
    title: "Ejby Bødekasse",
    // Splash-skærme (crest-på-grøn) — ingen hvid blink ved launch fra hjemmeskærm.
    startupImage: APPLE_SPLASH,
  },
  manifest: "/manifest.webmanifest",
  // Sikrer at moderne Chrome også får web-app-capable (Next udsender allerede
  // apple-mobile-web-app-capable via appleWebApp.capable).
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0e4d2a" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1410" },
  ],
  width: "device-width",
  initialScale: 1,
  // maximumScale fjernet bevidst (a11y) — touch-action:manipulation håndterer
  // 300ms-tap-delay uden at slå pinch-zoom fra.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={`${geistSans.variable} antialiased`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
