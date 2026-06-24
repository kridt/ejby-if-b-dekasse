import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aktiverer Reacts <ViewTransition> (Next 16 kører på en React-canary der
  // understøtter dette) — bruges til native-agtige rute-/elementovergange.
  // Kræver IKKE react@canary installeret.
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
