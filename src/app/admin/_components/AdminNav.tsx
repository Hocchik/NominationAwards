"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { logoutAction } from "../actions";

const LINKS = [
  { href: "/admin/evento", label: "Evento" },
  { href: "/admin/categorias", label: "Categorías" },
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
              "flex min-h-11 items-center rounded-xl px-4 text-sm font-medium transition-colors",
              current ? "bg-surface-strong text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex min-h-11 items-center rounded-xl px-4 text-sm text-muted transition-colors hover:text-foreground"
        >
          Salir
        </button>
      </form>
    </nav>
  );
}
