"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useDemo } from "./DemoProvider";

const STEPS = [
  { href: "/demo/entrar", label: "Entrar" },
  { href: "/demo/nominar", label: "Nominar" },
  { href: "/demo/nominados", label: "Nominados" },
  { href: "/demo/votar", label: "Votar" },
  { href: "/demo/ganador", label: "Ganador" },
] as const;

/** Franja de noche arriba de todo el demo: recuerda que nada se guarda y lleva los pasos. */
export function DemoBanner() {
  const pathname = usePathname();
  const { self, nominationSent, voteSent } = useDemo();
  const done: Partial<Record<string, boolean>> = {
    "/demo/entrar": self !== null,
    "/demo/nominar": nominationSent,
    "/demo/votar": voteSent,
  };

  return (
    <div className="theme-night sticky top-0 z-10 bg-bg">
      <div className="mx-auto flex max-w-[80rem] flex-wrap items-center justify-between gap-x-6 px-4 sm:px-6 lg:px-10">
        <Link
          href="/demo"
          className="flex min-h-11 items-center gap-2 font-display text-[11px] font-semibold tracking-[0.14em] uppercase"
        >
          <span aria-hidden="true" className="size-2 bg-copper" />
          Demo · nada <span className="max-sm:hidden">de esto</span> se guarda
        </Link>
        <Link href="/" className="flex min-h-11 items-center text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline sm:order-last">
          Salir del demo
        </Link>
        <nav aria-label="Pasos del demo" className="-mx-2 flex w-full gap-0.5 overflow-x-auto text-sm font-semibold sm:mx-0 sm:w-auto sm:flex-1">
          {STEPS.map((step, i) => {
            const current = pathname === step.href;
            return (
              <Link
                key={step.href}
                href={step.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-1.5 border-b-[3px] px-1.5 sm:px-2",
                  current ? "border-copper text-ink" : "border-transparent text-ink-soft hover:text-ink",
                )}
              >
                <span aria-hidden="true" className="font-display text-[11px] text-ink-faint max-sm:hidden">
                  {i + 1}
                </span>
                {step.label}
                {done[step.href] && (
                  <span className="text-copper">
                    <span aria-hidden="true">✓</span>
                    <span className="sr-only"> (hecho)</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
