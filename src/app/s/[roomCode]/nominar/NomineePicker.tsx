"use client";

import { type KeyboardEvent, useId, useMemo, useState } from "react";
import { type Candidate, type Nominee, cleanExternalName } from "@/lib/ballots/nomination";
import { cn } from "@/lib/cn";
import { normalizeName } from "@/lib/participants/names";

type Option = { kind: "participant"; id: string; name: string } | { kind: "external"; name: string };

/**
 * Campo con sugerencias (patrón "combobox" de ARIA): se escribe, aparecen las
 * personas del grupo que coinciden y, al final, la opción de agregar a alguien
 * de fuera con lo escrito. Flechas para moverse, Enter para elegir.
 */
export function NomineePicker({
  candidates,
  picked,
  disabled,
  selfName,
  onAdd,
}: {
  candidates: Candidate[];
  picked: Nominee[];
  disabled: boolean;
  /** Nombre de quien nomina: no puede agregarse a sí mismo ni como «de fuera». */
  selfName: string;
  onAdd: (nominee: Nominee) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const normalized = useMemo(
    () => candidates.map((c) => ({ ...c, key: normalizeName(c.name) })),
    [candidates],
  );

  const options = useMemo<Option[]>(() => {
    const q = normalizeName(query);
    if (!q) return [];
    const pickedIds = new Set(picked.flatMap((p) => (p.type === "participant" ? [p.id] : [])));
    const matches = normalized
      .filter((c) => !pickedIds.has(c.id) && (c.key.startsWith(q) || c.key.split(" ").some((w) => w.startsWith(q))))
      .slice(0, 6)
      .map((c): Option => ({ kind: "participant", id: c.id, name: c.name }));
    const external = cleanExternalName(query);
    const key = normalizeName(external);
    const isGroupMember = normalized.some((c) => c.key === key);
    const isSelf = key === normalizeName(selfName);
    return external.length >= 2 && !isGroupMember && !isSelf
      ? [...matches, { kind: "external", name: external }]
      : matches;
  }, [query, normalized, picked, selfName]);

  function choose(option: Option) {
    onAdd(option.kind === "participant" ? { type: "participant", id: option.id } : { type: "external", name: option.name });
    setQuery("");
    setActive(0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
    } else if (event.key === "Enter" && options[active]) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape") {
      setQuery("");
    }
  }

  const listId = `${id}-sugerencias`;
  const open = options.length > 0;

  return (
    <div className="space-y-1.5">
      <label htmlFor={`${id}-campo`} className="block text-sm font-medium">
        {disabled ? "Llegaste al máximo de nombres en esta categoría" : "Escribe un nombre"}
      </label>
      <input
        id={`${id}-campo`}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${id}-op-${active}` : undefined}
        autoComplete="off"
        value={query}
        disabled={disabled}
        maxLength={60}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        className="glass min-h-12 w-full rounded-xl px-4 text-base text-foreground placeholder:text-muted/70 disabled:opacity-50"
        placeholder="Alguien del grupo o de fuera"
      />
      <ul id={listId} role="listbox" aria-label="Sugerencias" hidden={!open} className="glass overflow-hidden rounded-xl">
        {options.map((option, i) => (
          <li
            key={option.kind === "participant" ? option.id : `externo-${option.name}`}
            id={`${id}-op-${i}`}
            role="option"
            aria-selected={i === active}
            // mousedown en vez de click: elige antes de que el campo pierda el foco
            onMouseDown={(e) => {
              e.preventDefault();
              choose(option);
            }}
            className={cn(
              "flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 text-sm",
              i === active && "bg-surface-strong",
            )}
          >
            {option.kind === "participant" ? (
              <>
                <span>{option.name}</span>
                <span className="text-xs text-muted">del grupo</span>
              </>
            ) : (
              <span>
                + Agregar «{option.name}» <span className="text-xs text-muted">(alguien de fuera)</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
