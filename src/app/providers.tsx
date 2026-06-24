"use client";

import { AuthProvider } from "@/context/AuthContext";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerRegister />
      {children}
    </AuthProvider>
  );
}
