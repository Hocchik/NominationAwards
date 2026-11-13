"use client";

import { useId, useMemo, useState } from "react";
import { initials } from "@/lib/initials";
import { normalizeName } from "@/lib/participants/names";

/**
 * Lista de invitados para elegir tu nombre: tarjetas a la vista y un buscador
 * arriba para encontrarte rápido. Todas las tarjetas se ven iguales: nada dice
 * quién ya entró o votó.
 */
export function NameGrid({ names, onPick }: { names: string[]; onPick: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const visible = useMemo(() => {
    const q = normalizeName(query);
    return q ? names.filter((n) => normalizeName(n).includes(q)) : names;
  }, [names, query]);

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
          placeholder="Escribe para filtrar…"
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
          {visible.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => onPick(name)}
                className="group relative isolate flex min-h-14 w-full items-center gap-2.5 bg-line p-2 text-left chamfer-10 before:absolute before:inset-px before:-z-10 before:bg-sheet before:chamfer-9 hover:bg-ink hover:before:bg-raised"
              >
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center bg-sand font-display text-sm font-extrabold chamfer-6"
                >
                  {initials(name)}
                </span>
                <span className="min-w-0 flex-1 text-[15px] leading-tight font-semibold break-words">{name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
