"use client";

import { MotionConfig } from "motion/react";
import { AuthProvider } from "@/context/AuthContext";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/Toast";
import { InstallPrompt } from "@/components/InstallPrompt";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    // reducedMotion="user" respekterer systemets "reducér bevægelse" overalt.
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ServiceWorkerRegister />
        <ToastProvider>
          {children}
          <InstallPrompt />
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
