import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Sideovergange håndteres med Motion (se AppShell), ikke Reacts eksperimentelle
     ViewTransition — den gav endnu ingen synlig animation i Next 16.2.9. */
};

export default nextConfig;
