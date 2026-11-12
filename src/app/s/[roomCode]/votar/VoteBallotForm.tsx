"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CopyButton } from "@/components/ui/CopyButton";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import type { CategoryType } from "@/generated/prisma/enums";
import { generateReceiptCode } from "@/lib/ballots/receipt";
import { buildVoteBallot, validateVotes } from "@/lib/ballots/vote";
import { cn } from "@/lib/cn";
import { sealPayload } from "@/lib/crypto/seal";
import { initials } from "@/lib/initials";
import { submitVoteAction } from "./actions";

interface FinalistInfo {
  id: string;
  name: string;
  photoUrl: string | null;
  blurb: string | null;
}

interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  type: CategoryType;
  finalists: FinalistInfo[];
}

/** Elección por categoría: id del finalista, null = me abstengo, undefined = sin elegir. */
type Votes = Record<string, string | null>;

// Borrador en sessionStorage: sobrevive a una recarga y se borra al cerrar la
// pestaña o al enviar. Nunca sale de este navegador.
const draftKey = (roomCode: string) => `voto-borrador-${roomCode}`;

export function VoteBallotForm({
  roomCode,
  eventName,
  categories,
  allowAbstention,
  publicKey,
  ballotBytes,
  closesAt,
}: {
  roomCode: string;
  eventName: string;
  categories: CategoryInfo[];
  allowAbstention: boolean;
  publicKey: string;
  ballotBytes: number;
  closesAt: string | null;
}) {
  const [votes, setVotes] = useState<Votes>({});
  const [restored, setRestored] = useState(false);
  const [index, setIndex] = useState(0); // categories.length = revisión
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ids = useMemo(() => categories.map((c) => c.id), [categories]);
  const issues = validateVotes(
    votes,
    categories.map((c) => ({ id: c.id, finalistIds: c.finalists.map((f) => f.id) })),
    allowAbstention,
  );

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con un almacenamiento externo una sola vez
      setVotes(JSON.parse(sessionStorage.getItem(draftKey(roomCode)) ?? "{}"));
    } catch {}
    setRestored(true);
  }, [roomCode]);

  useEffect(() => {
    if (!restored || receipt) return;
    try {
      sessionStorage.setItem(draftKey(roomCode), JSON.stringify(votes));
    } catch {}
  }, [votes, restored, receipt, roomCode]);

  function choose(categoryId: string, choice: string | null) {
    setVotes((prev) => ({ ...prev, [categoryId]: choice }));
  }

  function choiceLabel(category: CategoryInfo): string {
    const choice = votes[category.id];
    if (choice === undefined) return "Sin elegir";
    if (choice === null) return "Me abstengo";
    return category.finalists.find((f) => f.id === choice)?.name ?? "Sin elegir";
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const code = generateReceiptCode();
        const ballot = buildVoteBallot(votes, ids, code);
        // Se sella aquí: al servidor solo llega texto cifrado.
        const ciphertext = await sealPayload({ ...ballot }, publicKey, ballotBytes);
        const result = await submitVoteAction(roomCode, ciphertext, code);
        if (!result.ok) {
          setError(result.message ?? "No se pudo enviar.");
          return;
        }
        try {
          sessionStorage.removeItem(draftKey(roomCode));
        } catch {}
        setReceipt(code);
      } catch {
        setError("No se pudo sellar el voto en este dispositivo. Intenta de nuevo.");
      }
    });
  }

  if (receipt) {
    return (
      <Card className="space-y-5 text-center">
        <h1 className="font-display text-3xl font-semibold">¡Voto sellado!</h1>
        <p className="text-sm text-muted">
          Tu papeleta se cifró en este dispositivo y llegó a la urna. Nadie puede ver qué votaste:
          se abre en la ceremonia, junto con todas las demás.
        </p>
        <div className="space-y-1">
          <p className="text-sm text-muted">Tu comprobante</p>
          <p className="font-display text-4xl font-semibold tracking-[0.15em]">{receipt}</p>
        </div>
        <p className="text-xs text-muted">
          Antes de revelar a los ganadores se proyectan todos los comprobantes recibidos: busca el
          tuyo. Guárdalo (una captura sirve) y no lo compartas; no se vuelve a mostrar.
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
  const answered = ids.filter((id) => votes[id] !== undefined).length;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm text-muted">
          {eventName} · Votación final
          {closesAt && (
            <>
              {" "}· cierra el <LocalDateTime iso={closesAt} />
            </>
          )}
        </p>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">{reviewing ? "Revisión final" : `Categoría ${index + 1} de ${categories.length}`}</span>
          <span className="text-muted">
            {answered} de {categories.length} respondidas
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface" aria-hidden="true">
          <div className="h-1.5 rounded-full bg-gold transition-[width]" style={{ width: `${(answered / categories.length) * 100}%` }} />
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
          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm">Elige a una persona. Puedes cambiarla hasta sellar.</legend>
            {category.finalists.map((finalist) => {
              const selected = votes[category.id] === finalist.id;
              return (
                <label
                  key={finalist.id}
                  className={cn(
                    "glass flex min-h-20 cursor-pointer items-center gap-4 rounded-card p-3 transition-colors",
                    "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-soft",
                    selected && "border-gold/70 bg-gold/10",
                  )}
                >
                  <input
                    type="radio"
                    name={`voto-${category.id}`}
                    value={finalist.id}
                    checked={selected}
                    onChange={() => choose(category.id, finalist.id)}
                    className="sr-only"
                  />
                  {finalist.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- foto pequeña guardada como data URL
                    <img src={finalist.photoUrl} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-xl bg-surface-strong font-display text-xl">
                      {initials(finalist.name)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{finalist.name}</span>
                    {finalist.blurb && <span className="block text-sm text-muted italic">«{finalist.blurb}»</span>}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2", selected ? "border-gold bg-gold text-background" : "border-line")}
                  >
                    {selected ? "✓" : ""}
                  </span>
                </label>
              );
            })}
            {allowAbstention && (
              <label
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm",
                  votes[category.id] === null ? "border-gold/70" : "border-line",
                )}
              >
                <input
                  type="radio"
                  name={`voto-${category.id}`}
                  value="abstencion"
                  checked={votes[category.id] === null}
                  onChange={() => choose(category.id, null)}
                  className="size-4 accent-gold"
                />
                Me abstengo en esta categoría
              </label>
            )}
          </fieldset>
        </Card>
      )}

      {reviewing && (
        <Card className="space-y-5">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold">Revisa tu voto</h1>
            <p className="text-sm text-muted">Al sellarlo se cifra y ya no se puede cambiar.</p>
          </div>
          <ol className="space-y-2">
            {categories.map((c, i) => (
              <li key={c.id} className={cn("flex items-center justify-between gap-3 rounded-xl border px-4 py-3", issues[c.id] ? "border-danger/50" : "border-line")}>
                <div className="min-w-0">
                  <p className="text-sm text-muted">{c.name}</p>
                  <p className="font-medium">{choiceLabel(c)}</p>
                  {issues[c.id] && <p className="text-sm text-danger">{issues[c.id]}</p>}
                </div>
                <Button variant="ghost" onClick={() => setIndex(i)} aria-label={`Cambiar ${c.name}`}>
                  Cambiar
                </Button>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted">
            Tu voto se cifra en este dispositivo con la llave pública del notario y solo se abre en la
            ceremonia.{" "}
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
            {pending ? "Sellando y enviando…" : "Sellar mi voto"}
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
