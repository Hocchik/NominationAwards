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
  step,
  accent,
  onAdd,
}: {
  candidates: Candidate[];
  picked: Nominee[];
  disabled: boolean;
  /** Número del próximo nombre («4 · Escribe un nombre»). */
  step: number;
  /** Color de la categoría para el «+» de alguien de fuera. */
  accent: "copper" | "sage";
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
      <label
        htmlFor={`${id}-campo`}
        className="block font-display text-[10px] font-semibold tracking-[0.14em] text-ink-soft uppercase"
      >
        {disabled ? "Llegaste al máximo de nombres en esta categoría" : `${step} · Escribe un nombre`}
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
        className="min-h-12 w-full border-0 border-b-2 border-ink bg-transparent px-0.5 text-lg text-ink placeholder:text-ink-soft disabled:opacity-50"
        placeholder="Alguien del grupo o de fuera"
      />
      <ul id={listId} role="listbox" aria-label="Sugerencias" hidden={!open} className="border border-line bg-raised">
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
              "flex min-h-12 cursor-pointer items-center justify-between gap-3 border-b border-line/60 px-3 text-[15px] last:border-b-0",
              i === active && "bg-sand",
            )}
          >
            {option.kind === "participant" ? (
              <>
                <span className="font-semibold">{option.name}</span>
                <span className="text-xs text-ink-soft italic">del grupo</span>
              </>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn("grid size-[18px] place-items-center text-[13px] font-bold text-ink", accent === "copper" ? "bg-copper" : "bg-sage")}
                >
                  +
                </span>
                <span>
                  Usar «<strong>{option.name}</strong>» como alguien de fuera
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
