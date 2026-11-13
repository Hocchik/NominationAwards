"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AutofillBar,
  BallotIndex,
  CategoryHeading,
  CheckBox,
  DoubleRule,
  RoundBar,
  SealedScreen,
  SealNote,
  StepBar,
} from "@/components/ballot/BallotParts";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import type { CategoryType } from "@/generated/prisma/enums";
import { buildVoteBallot, validateVotes } from "@/lib/ballots/vote";
import { cn } from "@/lib/cn";
import { sealPayload } from "@/lib/crypto/seal";
import { initials } from "@/lib/initials";
import { type SubmitResult, submitVoteAction } from "./actions";

interface FinalistInfo {
  id: string;
  name: string;
  photoUrl: string | null;
  blurb: string | null;
  /** Es quien está votando: su tarjeta se muestra pero no se puede elegir. */
  isSelf?: boolean;
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
const pad = (n: number) => String(n).padStart(2, "0");

export function VoteBallotForm({
  roomCode,
  eventName,
  categories,
  allowAbstention,
  publicKey,
  ballotBytes,
  closesAt,
  onSubmit,
  doneLink,
  autofill,
}: {
  roomCode: string;
  eventName: string;
  categories: CategoryInfo[];
  allowAbstention: boolean;
  publicKey: string;
  ballotBytes: number;
  closesAt: string | null;
  /** Qué hacer con el voto ya sellado. Por defecto se envía al servidor. */
  onSubmit?: (ciphertext: string) => Promise<SubmitResult>;
  /** Botón de la pantalla «Voto sellado». Por defecto, «Ver nominados» de la sala. */
  doneLink?: { href: string; label: string };
  /** Solo el demo: marca un voto por categoría para saltar directo a la revisión. */
  autofill?: () => Votes;
}) {
  const [votes, setVotes] = useState<Votes>({});
  const [restored, setRestored] = useState(false);
  const [index, setIndex] = useState(0); // categories.length = revisión
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ids = useMemo(() => categories.map((c) => c.id), [categories]);
  const issues = validateVotes(
    votes,
    // Nadie puede votarse a sí mismo: su propia tarjeta no cuenta como opción.
    categories.map((c) => ({ id: c.id, finalistIds: c.finalists.filter((f) => !f.isSelf).map((f) => f.id) })),
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
    if (!restored || sent) return;
    try {
      sessionStorage.setItem(draftKey(roomCode), JSON.stringify(votes));
    } catch {}
  }, [votes, restored, sent, roomCode]);

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
        const ballot = buildVoteBallot(votes, ids);
        // Se sella aquí: al servidor solo llega texto cifrado.
        const ciphertext = await sealPayload({ ...ballot }, publicKey, ballotBytes);
        const send = onSubmit ?? ((sealed: string) => submitVoteAction(roomCode, sealed));
        const result = await send(ciphertext);
        if (!result.ok) {
          setError(result.message ?? "No se pudo enviar.");
          return;
        }
        try {
          sessionStorage.removeItem(draftKey(roomCode));
        } catch {}
        setSent(true);
      } catch {
        setError("No se pudo sellar el voto en este dispositivo. Intenta de nuevo.");
      }
    });
  }

  const done = doneLink ?? { href: `/s/${roomCode}/nominados`, label: "Ver nominados" };

  if (sent) {
    return (
      <SealedScreen
        title="¡Listo!"
        text="Tu voto quedó guardado en secreto. Nadie puede ver qué marcaste."
        help="Se cerró con candado en tu celular. Solo se abre en la ceremonia, junto con todos los demás y ya sin nombre."
        actions={
          <Link href={done.href} className={buttonClasses({ className: "flex-1" })}>
            {done.label}
          </Link>
        }
      />
    );
  }

  const reviewing = index >= categories.length;
  const category = categories[index];
  const answered = ids.filter((id) => votes[id] !== undefined).length;
  const progress = `${answered} de ${categories.length} marcadas`;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8">
      <div className="space-y-2">
        {autofill && (
          <AutofillBar
            onFill={() => {
              setVotes(autofill());
              setIndex(categories.length);
            }}
          />
        )}
        <RoundBar
          label={`${eventName} · Votar`}
          step={reviewing ? "Revisión" : `${pad(index + 1)} / ${pad(categories.length)}`}
        />
        <Card className="space-y-3.5 px-[18px] py-[18px] sm:px-7 sm:py-6">
          <StepBar
            done={ids.map((id) => votes[id] !== undefined)}
            current={reviewing ? -1 : index}
            label={`Llevas ${progress}`}
          />
          {closesAt && (
            <p className="text-xs text-ink-soft">
              La votación cierra el <LocalDateTime iso={closesAt} />
            </p>
          )}

          {!reviewing && category && (
            <>
              <CategoryHeading
                type={category.type}
                eyebrow={`Papeleta · categoría ${pad(index + 1)}`}
                name={category.name}
                description={category.description}
              />
              <fieldset className={category.type === "PRIZE" ? "accent-prize" : "accent-honor"}>
                <legend className="mb-2.5 text-[13px] text-ink-soft">Elige a una persona. Puedes cambiarla hasta sellar.</legend>
                <div className="border-t-2 border-ink">
                  {category.finalists.map((finalist) => {
                    if (finalist.isSelf) return <SelfRow key={finalist.id} finalist={finalist} />;
                    const selected = votes[category.id] === finalist.id;
                    return (
                      <label
                        key={finalist.id}
                        className={cn(
                          "flex min-h-[92px] cursor-pointer items-center gap-3 border-b border-l-[3px] border-b-line py-2.5 pr-1.5 pl-2.5 transition-colors",
                          "has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink",
                          selected ? "border-l-copper bg-raised" : "border-l-transparent hover:bg-raised/60",
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
                          <span className="photo-duotone h-[68px] w-16 shrink-0 overflow-hidden chamfer-10">
                            {/* eslint-disable-next-line @next/next/no-img-element -- foto pequeña guardada como data URL */}
                            <img src={finalist.photoUrl} alt="" className="size-full object-cover" />
                          </span>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="grid h-[68px] w-16 shrink-0 place-items-center bg-sand font-display text-xl font-extrabold chamfer-10"
                          >
                            {initials(finalist.name)}
                          </span>
                        )}
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="font-display text-[15px] leading-tight font-bold">{finalist.name}</span>
                          {finalist.blurb && (
                            <span className="text-[13px] leading-snug text-ink-soft italic">{finalist.blurb}</span>
                          )}
                          {selected && (
                            <span className="self-start bg-copper px-1.5 py-[3px] font-display text-[9px] font-bold tracking-[0.14em] text-ink uppercase">
                              Tu voto
                            </span>
                          )}
                        </span>
                        <CheckBox checked={selected} />
                      </label>
                    );
                  })}
                  {allowAbstention && (
                    <label
                      className={cn(
                        "flex min-h-14 cursor-pointer items-center gap-3 border-b border-l-[3px] border-b-line py-2 pr-1.5 pl-2.5 text-[15px] transition-colors",
                        "has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink",
                        votes[category.id] === null ? "border-l-ink bg-raised font-semibold" : "border-l-transparent text-ink-soft hover:bg-raised/60",
                      )}
                    >
                      <input
                        type="radio"
                        name={`voto-${category.id}`}
                        value="abstencion"
                        checked={votes[category.id] === null}
                        onChange={() => choose(category.id, null)}
                        className="sr-only"
                      />
                      <span className="flex-1">Me abstengo en esta categoría</span>
                      <CheckBox checked={votes[category.id] === null} />
                    </label>
                  )}
                </div>
              </fieldset>
            </>
          )}

          {reviewing && (
            <>
              <DoubleRule left="Revisión final" right={progress} />
              <div className="space-y-1">
                <h1 className="font-display text-[25px] leading-tight font-bold">Revisa tu voto</h1>
                <p className="text-sm text-ink-soft">Al sellarlo se cifra y ya no se puede cambiar.</p>
              </div>
              <ol className="border-t-2 border-ink">
                {categories.map((c, i) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 border-b border-line py-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="flex items-center gap-2 text-sm text-ink-soft">
                        <span aria-hidden="true" className={cn("size-2 shrink-0", c.type === "PRIZE" ? "bg-copper" : "bg-sage")} />
                        {c.name}
                      </p>
                      <p className="font-display text-[15px] font-bold">{choiceLabel(c)}</p>
                      {issues[c.id] && <p className="text-sm font-semibold text-danger">{issues[c.id]}</p>}
                    </div>
                    <Button variant="ghost" onClick={() => setIndex(i)} aria-label={`Cambiar ${c.name}`}>
                      Cambiar
                    </Button>
                  </li>
                ))}
              </ol>
              <SealNote>
                Tu voto se cifra en este dispositivo con la llave pública del notario y solo se abre en la ceremonia.{" "}
                <Link href="/transparencia" className="font-semibold text-ink underline decoration-copper decoration-2 underline-offset-4">
                  ¿Cómo funciona?
                </Link>
              </SealNote>
              {error && (
                <p role="alert" className="text-sm font-semibold text-danger">
                  {error}
                </p>
              )}
              <Button fullWidth size="lg" onClick={submit} disabled={pending || Object.keys(issues).length > 0}>
                {pending ? "Sellando y enviando…" : "Sellar mi voto"}
              </Button>
            </>
          )}

          <div className="flex flex-col gap-2.5 pt-1">
            {!reviewing && (
              <button
                type="button"
                onClick={() => setIndex(categories.length)}
                className="inline-flex min-h-10 items-center self-center text-sm font-semibold underline decoration-copper decoration-2 underline-offset-4"
              >
                Revisar mi papeleta · {progress}
              </button>
            )}
            <div className="flex gap-2.5">
              <Button variant="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0 || pending}>
                ← Anterior
              </Button>
              {!reviewing && (
                <Button className="flex-1" onClick={() => setIndex((i) => i + 1)}>
                  {index === categories.length - 1 ? "Revisar todo →" : "Siguiente →"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="lg:sticky lg:top-6 lg:pt-12">
        <BallotIndex
          title="Tu papeleta"
          current={index}
          onPick={setIndex}
          items={categories.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            status: choiceLabel(c),
            done: votes[c.id] !== undefined,
          }))}
        />
      </div>
    </div>
  );
}

/** Tu propia tarjeta: se ve, para que sepas que estás nominado, pero no se puede elegir. */
function SelfRow({ finalist }: { finalist: FinalistInfo }) {
  return (
    <div className="flex min-h-[92px] items-center gap-3 border-b border-l-[3px] border-b-line border-l-transparent py-2.5 pr-1.5 pl-2.5 opacity-60">
      <span
        aria-hidden="true"
        className="grid h-[68px] w-16 shrink-0 place-items-center bg-sand font-display text-xl font-extrabold chamfer-10"
      >
        {initials(finalist.name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-display text-[15px] leading-tight font-bold">{finalist.name}</span>
        <span className="text-[13px] leading-snug text-ink-soft">No puedes votarte a ti mismo.</span>
      </span>
      <span className="shrink-0 bg-ink px-2 py-1 font-display text-[9px] font-bold tracking-[0.14em] text-sheet uppercase">
        Eres tú
      </span>
    </div>
  );
}
