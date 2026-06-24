"use client";

import { AuthProvider } from "@/context/AuthContext";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/Toast";
import { InstallPrompt } from "@/components/InstallPrompt";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerRegister />
      <ToastProvider>
        {children}
        <InstallPrompt />
      </ToastProvider>
    </AuthProvider>
  );
}
