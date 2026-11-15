import Link from "next/link";
import { AdminDoor } from "@/components/room/AdminDoor";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { GuestEntry } from "@/lib/participants/guests";
import { EntryFlow } from "./EntryFlow";
import type { EntryTarget } from "./entryTarget";

/** La tarjeta para tocar tu nombre (también la usa la página principal mientras se nomina). */
export function EntryCard({
  eventName,
  guests,
  next,
  lead = "Toca tu nombre para entrar.",
}: {
  eventName: string;
  guests: GuestEntry[];
  next: EntryTarget;
  lead?: string;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <AdminDoor>
          <Logo />
        </AdminDoor>
        <ThemeToggle />
      </div>
      <Card className="space-y-6">
        <div className="space-y-1">
          <p className="text-sm text-ink-soft">Te damos la bienvenida a</p>
          <h1 className="font-display text-3xl leading-tight font-extrabold">{eventName}</h1>
          <p className="text-sm text-ink-soft">
            {lead} Lo que elijas es secreto: se cierra con candado en tu celular y se abre sin tu nombre.
          </p>
        </div>
        <EntryFlow next={next} guests={guests} />
        <Link href="/transparencia" className="flex min-h-11 items-center text-xs text-ink-soft underline underline-offset-4">
          ¿Quién puede ver lo que elijo?
        </Link>
      </Card>
    </>
  );
}
