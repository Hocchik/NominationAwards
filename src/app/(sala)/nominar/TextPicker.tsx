"use client";

import { useId, useState } from "react";
import { type Nominee, TEXT_MAX, cleanText } from "@/lib/ballots/nomination";

/**
 * Para las categorías de texto libre (la mejor frase, el mejor profe): una
 * casilla por cada cupo. Lo escrito se guarda tal cual; el organizador lee
 * todos los textos al cierre (sin saber quién los escribió), junta los que son lo mismo y pasan los más escritos.
 */
export function TextPicker({
  picked,
  maxPicks,
  placeholder,
  onChange,
}: {
  picked: Nominee[];
  maxPicks: number;
  placeholder: string;
  onChange: (list: Nominee[]) => void;
}) {
  const id = useId();
  // Cada casilla conserva su lugar aunque otra quede vacía.
  const [values, setValues] = useState<string[]>(() =>
    Array.from({ length: Math.max(1, maxPicks) }, (_, i) => {
      const n = picked[i];
      return n?.type === "text" ? n.text : "";
    }),
  );

  function update(index: number, value: string) {
    const next = values.map((v, i) => (i === index ? value : v));
    setValues(next);
    const seen = new Set<string>();
    const list: Nominee[] = [];
    for (const raw of next) {
      const text = cleanText(raw);
      const key = text.toLocaleLowerCase("es");
      if (text.length >= 2 && !seen.has(key)) {
        seen.add(key);
        list.push({ type: "text", text });
      }
    }
    onChange(list);
  }

  return (
    <div className="space-y-3">
      {values.map((value, i) => (
        <div key={i} className="space-y-1.5">
          <label htmlFor={`${id}-${i}`} className="block font-display text-[10px] font-semibold tracking-[0.14em] text-ink-soft uppercase">
            {i + 1} · Escribe {maxPicks > 1 ? (i === 0 ? "el primero" : "otro (opcional)") : "aquí"}
          </label>
          <textarea
            id={`${id}-${i}`}
            value={value}
            maxLength={TEXT_MAX}
            rows={2}
            placeholder={placeholder}
            onChange={(e) => update(i, e.target.value)}
            className="w-full resize-none border-0 border-b-2 border-ink bg-transparent px-0.5 py-1.5 text-lg text-ink placeholder:text-ink-soft"
          />
        </div>
      ))}
      <p className="text-xs text-ink-soft">Hasta {TEXT_MAX} caracteres cada uno. Nadie sabe quién lo escribió.</p>
    </div>
  );
}
