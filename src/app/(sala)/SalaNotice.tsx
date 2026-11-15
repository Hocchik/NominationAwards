import Link from "next/link";
import type { ReactNode } from "react";
import { AdminDoor } from "@/components/room/AdminDoor";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

/** Aviso corto de la sala (fase equivocada, ya enviaste…). El logo es la puerta escondida al panel. */
export function SalaNotice({ title, text, back = true, children }: { title: string; text: string; back?: boolean; children?: ReactNode }) {
  return (
    <Card className="mt-4 space-y-3">
      <AdminDoor>
        <Logo />
      </AdminDoor>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="text-sm text-ink-soft">{text}</p>
      {children}
      {back && (
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline decoration-copper decoration-2 underline-offset-4">
          Volver al inicio
        </Link>
      )}
    </Card>
  );
}
