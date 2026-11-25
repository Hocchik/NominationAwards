"use client";

import { useState } from "react";
import { type Candidate, type Nominee, makePair } from "@/lib/ballots/nomination";
import { NomineePicker } from "./NomineePicker";

/**
 * Para las categorías de parejas (shipeo, dúo): se elige a la primera persona
 * y luego con quién va. Las dos forman una sola nominación; el orden no importa.
 */
export function PairPicker({
  candidates,
  disabled,
  selfName,
  accent,
  onAdd,
}: {
  candidates: Candidate[];
  disabled: boolean;
  selfName: string;
  accent: "copper" | "sage";
  onAdd: (nominee: Nominee) => void;
}) {
  const [first, setFirst] = useState<Candidate | null>(null);

  if (!first) {
    return (
      <NomineePicker
        candidates={candidates}
        picked={[]}
        disabled={disabled}
        selfName={selfName}
        step={1}
        accent={accent}
        allowExternal={false}
        label="1 · La primera persona de la pareja"
        onAdd={(nominee) => {
          if (nominee.type !== "participant") return;
          setFirst(candidates.find((c) => c.id === nominee.id) ?? null);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-soft">Pareja con</span>
        <strong className="text-base">{first.name}</strong>
        <button
          type="button"
          onClick={() => setFirst(null)}
          className="min-h-9 px-2 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Cambiar
        </button>
      </p>
      <NomineePicker
        candidates={candidates}
        picked={[]}
        disabled={disabled}
        selfName={selfName}
        step={2}
        accent={accent}
        allowExternal={false}
        excludeIds={[first.id]}
        label={`2 · ¿Con quién va ${first.name.split(/\s+/)[0]}?`}
        onAdd={(nominee) => {
          if (nominee.type !== "participant") return;
          onAdd(makePair(first.id, nominee.id));
          setFirst(null);
        }}
      />
    </div>
  );
}
