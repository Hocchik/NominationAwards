"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type { CategoryType } from "@/generated/prisma/enums";
import {
  type Candidate,
  type NominationRules,
  type Nominee,
  addNominee,
  buildNominationBallot,
  validateNominations,
} from "@/lib/ballots/nomination";
import { generateReceiptCode } from "@/lib/ballots/receipt";
import { cn } from "@/lib/cn";
import { sealPayload } from "@/lib/crypto/seal";
import { CopyButton } from "@/components/ui/CopyButton";
import { submitNominationAction } from "./actions";
import { NomineePicker } from "./NomineePicker";

interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  type: CategoryType;
}

// El borrador se guarda en sessionStorage (solo esta pestaña; se borra al
// cerrarla) para no perder lo escrito si se recarga. Nunca sale del navegador.
const draftKey = (roomCode: string) => `nominacion-borrador-${roomCode}`;

function loadDraft(roomCode: string): Record<string, Nominee[]> {
  try {
    return JSON.parse(sessionStorage.getItem(draftKey(roomCode)) ?? "{}");
  } catch {
    return {};
  }
}

export function NominationBallot({
  roomCode,
  eventName,
  categories,
  candidates,
  rules,
  publicKey,
  ballotBytes,
  selfName,
}: {
  roomCode: string;
  eventName: string;
  categories: CategoryInfo[];
  candidates: Candidate[];
  rules: NominationRules;
  publicKey: string;
  ballotBytes: number;
  selfName: string;
}) {
  const [selections, setSelections] = useState<Record<string, Nominee[]>>({});
  const [restored, setRestored] = useState(false);
  const [index, setIndex] = useState(0); // categories.length = pantalla de revisión
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ids = useMemo(() => categories.map((c) => c.id), [categories]);
  const names = useMemo(() => new Map(candidates.map((c) => [c.id, c.name])), [candidates]);
  const issues = validateNominations(selections, ids, rules);

  // Recupera el borrador al montar (en el servidor no existe sessionStorage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con un almacenamiento externo una sola vez
    setSelections(loadDraft(roomCode));
    setRestored(true);
  }, [roomCode]);

  useEffect(() => {
    if (!restored || receipt) return;
    try {
      sessionStorage.setItem(draftKey(roomCode), JSON.stringify(selections));
    } catch {
      // sin almacenamiento: el borrador simplemente no se guarda
    }
  }, [selections, restored, receipt, roomCode]);

  function update(categoryId: string, list: Nominee[]) {
    setSelections((prev) => ({ ...prev, [categoryId]: list }));
  }

  function label(nominee: Nominee): string {
    return nominee.type === "participant" ? (names.get(nominee.id) ?? "Alguien del grupo") : nominee.name;
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const code = generateReceiptCode();
        const ballot = buildNominationBallot(selections, ids, code);
        // Se sella aquí, en este dispositivo: al servidor solo llega texto cifrado.
        const ciphertext = await sealPayload({ ...ballot }, publicKey, ballotBytes);
        const result = await submitNominationAction(roomCode, ciphertext, code);
        if (!result.ok) {
          setError(result.message ?? "No se pudo enviar.");
          return;
        }
        try {
          sessionStorage.removeItem(draftKey(roomCode));
        } catch {}
        setReceipt(code);
      } catch {
        setError("No se pudo sellar la papeleta en este dispositivo. Intenta de nuevo.");
      }
    });
  }

  if (receipt) {
    return (
      <Card className="space-y-5 text-center">
        <h1 className="font-display text-3xl font-semibold">¡Nominaciones enviadas!</h1>
        <p className="text-sm text-muted">
          Tu papeleta se selló en este dispositivo y llegó a la urna. Nadie puede ver qué nominaste:
          solo el notario la abre, al cierre, junto con todas las demás.
        </p>
        <div className="space-y-1">
          <p className="text-sm text-muted">Tu comprobante</p>
          <p className="font-display text-4xl font-semibold tracking-[0.15em]">{receipt}</p>
        </div>
        <p className="text-xs text-muted">
          Guárdalo (una captura sirve) y no lo compartas. No se vuelve a mostrar.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <CopyButton text={receipt} label="Copiar comprobante" />
          <Link href={`/s/${roomCode}`} className="inline-flex min-h-12 items-center px-4 text-sm text-gold underline underline-offset-4">
            Volver a la sala
          </Link>
        </div>
      </Card>
    );
  }

  const reviewing = index >= categories.length;
  const category = categories[index];
  const picked = category ? (selections[category.id] ?? []) : [];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm text-muted">{eventName} · Ronda 1</p>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">{reviewing ? "Revisión final" : `Categoría ${index + 1} de ${categories.length}`}</span>
          <span className="text-muted">
            {rules.allowSkip ? `De ${rules.min} a ${rules.max} nombres, o ninguno` : `De ${rules.min} a ${rules.max} nombres`}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface" aria-hidden="true">
          <div
            className="h-1.5 rounded-full bg-gold transition-[width]"
            style={{ width: `${(Math.min(index, categories.length) / categories.length) * 100}%` }}
          />
        </div>
      </div>

      {!reviewing && category && (
        <Card accent={category.type === "PRIZE" ? "prize" : "honor"} className="space-y-5">
          <div className="space-y-2">
            <Chip size="sm" tone={category.type === "PRIZE" ? "gold" : "honor"}>
              {category.type === "PRIZE" ? "Premio" : "Honorífica"}
            </Chip>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{category.name}</h1>
            <p className="text-muted">{category.description}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm" aria-live="polite">
              Llevas <strong>{picked.length}</strong> de {rules.max}
              {picked.length > 0 && picked.length < rules.min && ` · faltan ${rules.min - picked.length} para el mínimo`}
            </p>
            {picked.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {picked.map((nominee) => (
                  <li key={nominee.type === "participant" ? nominee.id : `x-${nominee.name}`}>
                    <Chip
                      tone={category.type === "PRIZE" ? "gold" : "honor"}
                      onRemove={() => update(category.id, picked.filter((n) => n !== nominee))}
                      removeLabel={`Quitar a ${label(nominee)}`}
                    >
                      {label(nominee)}
                      {nominee.type === "external" && <span className="text-xs opacity-75"> · de fuera</span>}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <NomineePicker
            candidates={candidates}
            picked={picked}
            disabled={picked.length >= rules.max}
            selfName={selfName}
            onAdd={(nominee) => update(category.id, addNominee(picked, nominee, candidates))}
          />
        </Card>
      )}

      {reviewing && (
        <Card className="space-y-5">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold">Revisa tu papeleta</h1>
            <p className="text-sm text-muted">Al enviarla se sella y ya no se puede cambiar.</p>
          </div>
          <ol className="space-y-3">
            {categories.map((c, i) => {
              const list = selections[c.id] ?? [];
              return (
                <li key={c.id} className={cn("rounded-xl border px-4 py-3", issues[c.id] ? "border-danger/50" : "border-line")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-muted">
                        {list.length ? list.map(label).join(" · ") : "Sin nominaciones"}
                      </p>
                      {issues[c.id] && <p className="text-sm text-danger">{issues[c.id]}</p>}
                    </div>
                    <Button variant="ghost" onClick={() => setIndex(i)} aria-label={`Cambiar ${c.name}`}>
                      Cambiar
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
          {issues._all && <p className="text-sm text-danger">{issues._all}</p>}
          <p className="text-xs text-muted">
            Tu papeleta se cifra en este dispositivo con la llave pública del notario. Ni el
            organizador ni el servidor pueden leerla.{" "}
            <Link href="/transparencia" className="underline underline-offset-4">
              ¿Cómo funciona?
            </Link>
          </p>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button fullWidth size="lg" onClick={submit} disabled={pending || Object.keys(issues).length > 0}>
            {pending ? "Sellando y enviando…" : "Sellar y enviar"}
          </Button>
        </Card>
      )}

      <div className="flex justify-between gap-3">
        <Button variant="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0 || pending}>
          ← Anterior
        </Button>
        {!reviewing && (
          <Button onClick={() => setIndex((i) => i + 1)}>
            {index === categories.length - 1 ? "Revisar todo →" : "Siguiente →"}
          </Button>
        )}
      </div>
    </div>
  );
}
