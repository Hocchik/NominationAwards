"use client";

import { useId, useMemo, useState } from "react";
import { initials } from "@/lib/initials";
import { type GuestEntry, matchesGuest } from "@/lib/participants/guests";

/**
 * Lista de invitados para elegir tu nombre: tarjetas a la vista y un buscador
 * arriba que también entiende apodos («gabo» → Gabriel Mendoza). Todas las
 * tarjetas se ven iguales: nada dice quién ya entró o votó.
 */
export function NameGrid({ guests, onPick }: { guests: GuestEntry[]; onPick: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const visible = useMemo(
    () =>
      guests
        .map((guest) => ({ guest, ...matchesGuest(guest, query) }))
        .filter((row) => row.match),
    [guests, query],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor={searchId} className="block text-sm font-semibold">
          Busca tu nombre
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tu nombre o tu apodo…"
          autoComplete="off"
          className="min-h-12 w-full border-[1.5px] border-line-strong bg-raised px-4 text-base text-ink placeholder:text-ink-soft"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-ink-soft" role="status">
          No encontramos «{query.trim()}». Si no estás en la lista, habla con el organizador.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Lista de invitados">
          {visible.map(({ guest, alias }) => (
            <li key={guest.name}>
              <button
                type="button"
                onClick={() => onPick(guest.name)}
                className="group relative isolate flex min-h-14 w-full items-center gap-2.5 bg-line p-2 text-left chamfer-10 before:absolute before:inset-px before:-z-10 before:bg-sheet before:chamfer-9 hover:bg-ink hover:before:bg-raised"
              >
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center bg-sand font-display text-sm font-extrabold chamfer-6"
                >
                  {initials(guest.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-tight font-semibold break-words">{guest.name}</span>
                  {/* Si lo encontró por apodo, se muestra cuál, para que sepa que es él. */}
                  {alias && <span className="block text-xs text-ink-soft">«{alias}»</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
