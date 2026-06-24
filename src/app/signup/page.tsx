"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button, Input, Label, Spinner } from "@/components/ui";
import { ClubLogo } from "@/components/ClubLogo";
import { authError } from "@/app/login/page";

export default function SignupPage() {
  const { signup, user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
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
    if (name.trim().length < 2) {
      setError("Skriv dit fulde navn.");
      return;
    }
    setBusy(true);
    try {
      await signup(name.trim(), email.trim(), password);
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <ClubLogo size={84} />
        <h1 className="mt-4 text-2xl font-extrabold">Opret konto</h1>
        <p className="mt-1 text-sm text-muted">Bliv en del af bødekassen i Ejby IF</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Fulde navn</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Christian Nielsen"
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mindst 6 tegn"
          />
        </div>

        {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

        <Button type="submit" loading={busy} className="w-full">
          Opret konto
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Har du allerede en konto?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Log ind
        </Link>
      </p>
    </div>
  );
}
