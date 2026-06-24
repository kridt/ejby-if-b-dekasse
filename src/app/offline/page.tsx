import { ClubLogo } from "@/components/ClubLogo";

export default function OfflinePage() {
  return (
    <div className="app-scroll mx-auto flex h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <ClubLogo size={72} />
      <h1 className="mt-4 text-xl font-extrabold">Du er offline</h1>
      <p className="mt-1 text-sm text-muted">
        Bødekassen kræver internet. Tjek din forbindelse og prøv igen.
      </p>
    </div>
  );
}
