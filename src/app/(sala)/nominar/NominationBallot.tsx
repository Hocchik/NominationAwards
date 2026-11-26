"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AutofillBar,
  BallotIndex,
  CategoryHeading,
  DoubleRule,
  RoundBar,
  SealedScreen,
  SealNote,
} from "@/components/ballot/BallotParts";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoaderOverlay } from "@/components/ui/Loader";
import type { CategoryFraming, CategoryType, NomineeKind } from "@/generated/prisma/enums";
import {
  type Candidate,
  type Nominee,
  addNominee,
  buildNominationBallot,
  validateNominations,
} from "@/lib/ballots/nomination";
import { cn } from "@/lib/cn";
import { sealPayload } from "@/lib/crypto/seal";
import { categoryTitle, pickInstruction } from "@/lib/event/categoryKinds";
import { type SubmitResult, submitNominationAction } from "./actions";
import { NomineePicker } from "./NomineePicker";
import { type NominationOption, OptionGrid } from "./OptionGrid";
import { PairPicker } from "./PairPicker";
import { TextPicker } from "./TextPicker";

export interface NominationCategoryInfo {
  id: string;
  name: string;
  description: string;
  type: CategoryType;
  framing: CategoryFraming;
  nomineeKind: NomineeKind;
  maxPicks: number;
  /** Mínimo obligatorio (0 = se puede dejar vacía). */
  minPicks: number;
  allowExternal: boolean;
  options: NominationOption[];
}

// El borrador se guarda en sessionStorage (solo esta pestaña; se borra al
// cerrarla) para no perder lo escrito si se recarga. Nunca sale del navegador.
const draftKey = (roomCode: string) => `nominacion-borrador-${roomCode}`;
const pad = (n: number) => String(n).padStart(2, "0");

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
  allowSkip,
  publicKey,
  ballotBytes,
  selfName,
  onSubmit,
  doneLink,
  autofill,
}: {
  roomCode: string;
  eventName: string;
  categories: NominationCategoryInfo[];
  candidates: Candidate[];
  /** Se puede dejar una categoría vacía. */
  allowSkip: boolean;
  publicKey: string;
  ballotBytes: number;
  selfName: string;
  /** Qué hacer con la papeleta ya sellada. Por defecto se envía al servidor. */
  onSubmit?: (ciphertext: string) => Promise<SubmitResult>;
  /** Botón de la pantalla sellada. Por defecto, «Ver nominados» de la sala. */
  doneLink?: { href: string; label: string };
  /** Solo el demo: arma una papeleta completa para saltar directo a la revisión. */
  autofill?: () => Record<string, Nominee[]>;
}) {
  const [selections, setSelections] = useState<Record<string, Nominee[]>>({});
  const [restored, setRestored] = useState(false);
  const [index, setIndex] = useState(0); // categories.length = pantalla de revisión
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ids = useMemo(() => categories.map((c) => c.id), [categories]);
  const names = useMemo(() => new Map(candidates.map((c) => [c.id, c.name])), [candidates]);
  const optionLabels = useMemo(
    () => new Map(categories.flatMap((c) => c.options.map((o) => [o.id, o.label] as const))),
    [categories],
  );
  const issues = validateNominations(selections, categories, allowSkip);

  // Recupera el borrador al montar (en el servidor no existe sessionStorage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con un almacenamiento externo una sola vez
    setSelections(loadDraft(roomCode));
    setRestored(true);
  }, [roomCode]);

  useEffect(() => {
    if (!restored || sent) return;
    try {
      sessionStorage.setItem(draftKey(roomCode), JSON.stringify(selections));
    } catch {
      // sin almacenamiento: el borrador simplemente no se guarda
    }
  }, [selections, restored, sent, roomCode]);

  function update(categoryId: string, list: Nominee[]) {
    setSelections((prev) => ({ ...prev, [categoryId]: list }));
  }

  function label(nominee: Nominee): string {
    switch (nominee.type) {
      case "participant":
        return names.get(nominee.id) ?? "Alguien del grupo";
      case "external":
        return nominee.name;
      case "pair":
        return nominee.ids.map((id) => names.get(id) ?? "Alguien del grupo").join(" y ");
      case "option":
        return optionLabels.get(nominee.id) ?? "Una opción";
      case "text":
        return `«${nominee.text}»`;
    }
  }

  const nomineeKey = (n: Nominee) =>
    n.type === "external"
      ? `x-${n.name}`
      : n.type === "pair"
        ? `pp-${n.ids.join("+")}`
        : n.type === "text"
          ? `t-${n.text}`
          : `${n.type}-${n.id}`;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const ballot = buildNominationBallot(selections, ids);
        // Se sella aquí, en este dispositivo: al servidor solo llega texto cifrado.
        const ciphertext = await sealPayload({ ...ballot }, publicKey, ballotBytes);
        const send = onSubmit ?? ((sealed: string) => submitNominationAction(sealed));
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
        setError("No se pudo sellar la papeleta en este dispositivo. Intenta de nuevo.");
      }
    });
  }

  const done = doneLink ?? { href: "/", label: "Volver al inicio" };

  if (sent) {
    return (
      <SealedScreen
        title="¡Listo!"
        text="Tus nominaciones quedaron guardadas en secreto. Nadie puede ver a quién nominaste."
        help="Se cerraron con candado en tu celular. Solo se abren al cierre de las nominaciones, todas juntas y ya sin nombre."
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
  const picked = category ? (selections[category.id] ?? []) : [];
  // Con un solo cupo nunca se bloquea: elegir otro reemplaza al anterior.
  const full = category ? category.maxPicks > 1 && picked.length >= category.maxPicks : false;
  const single = category?.maxPicks === 1;
  const accent = category?.type === "PRIZE" ? "copper" : "sage";

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8">
      {/* Mientras se sella y se envía: la carga a pantalla completa */}
      {pending && <LoaderOverlay label="Sellando tus nominaciones…" />}
      <div className="space-y-2">
        {autofill && (
          <AutofillBar
            onFill={() => {
              setSelections(autofill());
              setIndex(categories.length);
            }}
          />
        )}
        <RoundBar
          adminDoor={!onSubmit}
          label={`${eventName} · Nominar`}
          step={reviewing ? "Revisión" : `${pad(index + 1)} / ${pad(categories.length)}`}
        />
        <Card className="space-y-4 px-[18px] py-[18px] sm:px-7 sm:py-6">
          {!reviewing && category && (
            <>
              <DoubleRule left="Ficha de nominación" right={`Nº ${pad(index + 1)}`} />
              <CategoryHeading
                type={category.type}
                eyebrow={`Categoría · ${category.type === "PRIZE" ? "Premio" : "Honorífica"}`}
                name={categoryTitle(category)}
                description={category.description}
              />
              <p className="text-[13px] text-ink-soft" aria-live="polite">
                {pickInstruction(category.nomineeKind, category.maxPicks, category.minPicks)}
                {allowSkip && category.minPicks === 0 && category.nomineeKind !== "TEXT" && ", o déjala vacía"}
                {category.maxPicks > 1 && (
                  <>
                    {" "}
                    · llevas <strong className="text-ink">{picked.length}</strong>
                  </>
                )}
              </p>
              {picked.length > 0 && category.nomineeKind !== "OPTION" && category.nomineeKind !== "TEXT" && (
                <ol className="space-y-2">
                  {picked.map((nominee, i) => (
                    <li
                      key={nomineeKey(nominee)}
                      className="relative isolate flex min-h-11 items-center gap-2.5 bg-line pr-0.5 pl-2.5 chamfer-8 before:absolute before:inset-px before:-z-10 before:bg-raised before:chamfer-7"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid size-[22px] shrink-0 place-items-center font-display text-[11px] font-bold text-ink chamfer-5",
                          category.type === "PRIZE" ? "bg-copper" : "bg-sage",
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-base font-semibold">{label(nominee)}</span>
                      {nominee.type === "external" && (
                        <span className="text-[11px] font-bold tracking-[0.08em] text-ink-soft uppercase">De fuera</span>
                      )}
                      <button
                        type="button"
                        onClick={() => update(category.id, picked.filter((n) => n !== nominee))}
                        aria-label={`Quitar a ${label(nominee)}`}
                        className="grid size-11 shrink-0 place-items-center transition-colors hover:bg-ink/5"
                      >
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
                          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ol>
              )}

              {category.nomineeKind === "TEXT" ? (
                <TextPicker
                  key={category.id}
                  picked={picked}
                  maxPicks={category.maxPicks}
                  placeholder={/profe/i.test(category.name) ? "Nombre del profe, como lo recuerdes" : "Escríbela como la recuerdes"}
                  onChange={(list) => update(category.id, list)}
                />
              ) : category.nomineeKind === "OPTION" ? (
                <OptionGrid
                  options={category.options}
                  picked={picked}
                  maxPicks={category.maxPicks}
                  accent={accent}
                  onChange={(list) => update(category.id, list)}
                />
              ) : category.nomineeKind === "PAIR" ? (
                <PairPicker
                  key={category.id}
                  candidates={candidates}
                  disabled={full}
                  selfName={selfName}
                  accent={accent}
                  pairNumber={single ? 1 : picked.length + 1}
                  onAdd={(nominee) => update(category.id, addNominee(single ? [] : picked, nominee, candidates))}
                />
              ) : (
                <NomineePicker
                  candidates={candidates}
                  picked={picked}
                  disabled={full}
                  selfName={selfName}
                  step={picked.length + 1}
                  accent={accent}
                  allowExternal={category.allowExternal}
                  label={single ? (picked.length ? "¿Cambiar? Escribe otro nombre" : "Escribe un nombre") : undefined}
                  onAdd={(nominee) =>
                    // Con un solo cupo, elegir a otra persona la reemplaza
                    update(category.id, addNominee(single ? [] : picked, nominee, candidates))
                  }
                />
              )}
              <SealNote>Al final tus fichas se sellan en tu dispositivo. Nadie las abre hasta el cierre.</SealNote>
            </>
          )}

          {reviewing && (
            <>
              <DoubleRule left="Revisión final" right={`${pad(categories.length)} fichas`} />
              <div className="space-y-1">
                <h1 className="font-display text-[25px] leading-tight font-bold">Revisa tu papeleta</h1>
                <p className="text-sm text-ink-soft">Al enviarla se sella y ya no se puede cambiar.</p>
              </div>
              <ol className="border-t-2 border-ink">
                {categories.map((c, i) => {
                  const list = selections[c.id] ?? [];
                  return (
                    <li key={c.id} className="flex items-start justify-between gap-3 border-b border-line py-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="flex items-center gap-2 font-display text-sm font-bold">
                          <span aria-hidden="true" className={cn("size-2 shrink-0", c.type === "PRIZE" ? "bg-copper" : "bg-sage")} />
                          {categoryTitle(c)}
                        </p>
                        <p className="text-sm text-ink-soft">{list.length ? list.map(label).join(" · ") : "Sin nominaciones"}</p>
                        {issues[c.id] && <p className="text-sm font-semibold text-danger">{issues[c.id]}</p>}
                      </div>
                      <Button variant="ghost" onClick={() => setIndex(i)} aria-label={`Cambiar ${categoryTitle(c)}`}>
                        Cambiar
                      </Button>
                    </li>
                  );
                })}
              </ol>
              {issues._all && <p className="text-sm font-semibold text-danger">{issues._all}</p>}
              <SealNote>
                Tu papeleta se cifra en este dispositivo con la llave pública del notario. Ni el organizador ni el
                servidor pueden leerla.{" "}
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
                {pending ? "Sellando y enviando…" : "Sellar y enviar"}
              </Button>
            </>
          )}

          <div className="flex gap-2.5 pt-1">
            <Button variant="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0 || pending}>
              ← Anterior
            </Button>
            {!reviewing && (
              <Button className="flex-1" onClick={() => setIndex((i) => i + 1)}>
                {index === categories.length - 1 ? (
                  "Revisar todo →"
                ) : (
                  <>
                    Siguiente<span className="max-sm:hidden"> ficha</span> →
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:pt-12">
        <BallotIndex
          title="Tus fichas"
          current={index}
          onPick={setIndex}
          items={categories.map((c) => {
            const count = (selections[c.id] ?? []).length;
            return {
              id: c.id,
              name: categoryTitle(c),
              type: c.type,
              status: count ? (c.maxPicks === 1 ? "Listo" : `${count} de ${c.maxPicks}`) : c.minPicks > 0 ? "Falta (obligatoria)" : "Sin nominar",
              done: count >= Math.max(1, c.minPicks),
            };
          })}
        />
        {!reviewing && (
          <Button variant="secondary" fullWidth className="max-lg:hidden" onClick={() => setIndex(categories.length)}>
            Revisar y sellar
          </Button>
        )}
      </div>
    </div>
  );
}
