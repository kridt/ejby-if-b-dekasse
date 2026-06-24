"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui";

const steps = [
  {
    title: "Alle kan give bøder",
    body: "Giv en holdkammerat en bøde fra bødekataloget — fx for at komme for sent.",
  },
  {
    title: "Admin godkender",
    body: "En admin godkender bøden, før den tæller med på tavlen.",
  },
  {
    title: "Betal via MobilePay",
    body: "Betal din gæld på MobilePay og markér beløbet som betalt på din profil.",
  },
  {
    title: "Admin bekræfter",
    body: "En admin bekræfter betalingen, og din saldo bliver opdateret.",
  },
];

/** Sammenfoldelig "Sådan virker det"-hjælp. */
export function HowItWorks() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16v-4M12 8.5v.5" />
          </svg>
        </span>
        <span className="flex-1 font-semibold">Sådan virker det</span>
        <svg
          className={`size-5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ol id={panelId} className="space-y-3 border-t border-border px-4 py-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-sm text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
