import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
    // TODO (vedligeholder): generér apple-touch-startup-image splash-PNG'er
    // (crest-på-grøn, lys+mørk) og tilføj dem her som startupImage: [...].
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
