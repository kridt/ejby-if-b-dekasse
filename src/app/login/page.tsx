"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button, Input, Label, Spinner } from "@/components/ui";
import { ClubLogo } from "@/components/ClubLogo";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(authError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="flex min-h-dvh items-center justify-center text-primary">
        <Spinner className="size-8" />
      </div>
    );

  return (
    <div className="app-scroll mx-auto flex h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <ClubLogo size={84} />
        <h1 className="mt-4 text-2xl font-extrabold">Ejby IF Bødekasse</h1>
        <p className="mt-1 text-sm text-muted">Log ind for at se tavlen og dine bøder</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dig@eksempel.dk"
          />
        </div>
        <div>
          <Label htmlFor="password">Adgangskode</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

        <Button type="submit" loading={busy} className="w-full">
          Log ind
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Ny i klubben?{" "}
        <Link href="/signup" className="font-semibold text-primary">
          Opret konto
        </Link>
      </p>
    </div>
  );
}

export function authError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Forkert e-mail eller adgangskode.";
    case "auth/email-already-in-use":
      return "Der findes allerede en konto med denne e-mail.";
    case "auth/weak-password":
      return "Adgangskoden skal være mindst 6 tegn.";
    case "auth/invalid-email":
      return "Ugyldig e-mailadresse.";
    case "auth/too-many-requests":
      return "For mange forsøg. Prøv igen om lidt.";
    default:
      return "Noget gik galt. Prøv igen.";
  }
}
