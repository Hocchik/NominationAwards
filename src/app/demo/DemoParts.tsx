"use client";

import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Esqueleto mientras se generan las llaves de juguete. */
export function DemoLoading({ label }: { label: string }) {
  return (
    <Card className="h-72 animate-pulse" aria-busy="true">
      <span className="sr-only">{label}</span>
    </Card>
  );
}

/** Para nominar o votar en el demo primero hay que elegir un nombre. */
export function DemoNeedsName({ action }: { action: string }) {
  return (
    <Card className="mx-auto mt-4 max-w-md space-y-4 text-center">
      <h1 className="font-display text-2xl font-bold">Primero, ¿quién eres?</h1>
      <p className="text-sm text-ink-soft">
        Para {action}, toca tu nombre en la lista de invitados, como en la sala real.
      </p>
      <Link href="/demo/entrar" className={buttonClasses({ fullWidth: true })}>
        Elegir mi nombre →
      </Link>
    </Card>
  );
}

/** Al volver a un paso ya enviado: aviso y la opción de repetirlo. */
export function DemoSent({
  title,
  text,
  next,
  againLabel,
  onAgain,
}: {
  title: string;
  text: string;
  next: { href: string; label: string };
  againLabel: string;
  onAgain: () => void;
}) {
  return (
    <Card className="mx-auto mt-4 max-w-md space-y-5 text-center">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="text-sm text-ink-soft">{text}</p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Link href={next.href} className={buttonClasses({ className: "flex-1" })}>
          {next.label}
        </Link>
        <Button variant="secondary" className="flex-1" onClick={onAgain}>
          {againLabel}
        </Button>
      </div>
    </Card>
  );
}
