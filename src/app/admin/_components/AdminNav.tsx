"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { logoutAction } from "../actions";

const LINKS = [
  { href: "/admin/evento", label: "Evento" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/participantes", label: "Participantes" },
  { href: "/admin/cierre-nominaciones", label: "Cierre" },
  { href: "/admin/finalistas", label: "Finalistas" },
  { href: "/ceremonia", label: "Ceremonia" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel del organizador" className="flex flex-wrap items-center gap-1">
      {LINKS.map((link) => {
        const current = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center px-4 text-sm font-semibold transition-colors",
              current ? "bg-ink text-sheet" : "text-ink hover:bg-ink/5",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex min-h-11 items-center px-4 text-sm text-ink-soft transition-colors hover:text-ink"
        >
          Salir
        </button>
      </form>
    </nav>
  );
}
