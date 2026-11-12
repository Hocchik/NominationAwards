"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  BallotIndex,
  CategoryHeading,
  DoubleRule,
  RoundBar,
  SealedScreen,
  SealNote,
} from "@/components/ballot/BallotParts";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
import { type SubmitResult, submitNominationAction } from "./actions";
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
  rules,
  publicKey,
  ballotBytes,
  selfName,
  onSubmit,
  doneLink,
}: {
  roomCode: string;
  eventName: string;
  categories: CategoryInfo[];
  candidates: Candidate[];
  rules: NominationRules;
  publicKey: string;
  ballotBytes: number;
  selfName: string;
  /** Qué hacer con la papeleta ya sellada. Por defecto se envía al servidor. */
  onSubmit?: (ciphertext: string, receipt: string) => Promise<SubmitResult>;
  /** Botón de la pantalla sellada. Por defecto, «Ver nominados» de la sala. */
  doneLink?: { href: string; label: string };
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
        const send = onSubmit ?? ((sealed: string, receiptCode: string) => submitNominationAction(roomCode, sealed, receiptCode));
        const result = await send(ciphertext, code);
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

  const done = doneLink ?? { href: `/s/${roomCode}/nominados`, label: "Ver nominados" };

  if (receipt) {
    return (
      <SealedScreen
        title="Nominaciones selladas"
        text="Tus fichas se cifraron en este dispositivo y llegaron a la urna. Nadie puede ver a quién nominaste."
        code={receipt}
        receiptNote="No se vuelve a mostrar"
        help="Solo el notario abre la urna, al cierre, junto con todas las demás. Guarda el comprobante (una captura sirve) y no lo compartas."
        actions={
          <>
            <CopyButton text={receipt} label="Copiar código" className="flex-1" />
            <Link href={done.href} className={buttonClasses({ className: "flex-1" })}>
              {done.label}
            </Link>
          </>
        }
      />
    );
  }

  const reviewing = index >= categories.length;
  const category = categories[index];
  const picked = category ? (selections[category.id] ?? []) : [];
  const range = `de ${rules.min} a ${rules.max} nombres${rules.allowSkip ? ", o ninguno" : ""}`;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8">
      <div className="space-y-2">
        <RoundBar
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
                name={category.name}
                description={category.description}
              />
              <p className="text-[13px] text-ink-soft" aria-live="polite">
                Escribe {range} · llevas <strong className="text-ink">{picked.length}</strong>
                {picked.length > 0 && picked.length < rules.min && ` · faltan ${rules.min - picked.length} para el mínimo`}
              </p>
              {picked.length > 0 && (
                <ol className="space-y-2">
                  {picked.map((nominee, i) => (
                    <li
                      key={nominee.type === "participant" ? nominee.id : `x-${nominee.name}`}
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

              <NomineePicker
                candidates={candidates}
                picked={picked}
                disabled={picked.length >= rules.max}
                selfName={selfName}
                step={picked.length + 1}
                accent={category.type === "PRIZE" ? "copper" : "sage"}
                onAdd={(nominee) => update(category.id, addNominee(picked, nominee, candidates))}
              />
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
                          {c.name}
                        </p>
                        <p className="text-sm text-ink-soft">{list.length ? list.map(label).join(" · ") : "Sin nominaciones"}</p>
                        {issues[c.id] && <p className="text-sm font-semibold text-danger">{issues[c.id]}</p>}
                      </div>
                      <Button variant="ghost" onClick={() => setIndex(i)} aria-label={`Cambiar ${c.name}`}>
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
                {index === categories.length - 1 ? "Revisar todo →" : "Siguiente ficha →"}
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
              name: c.name,
              type: c.type,
              status: count ? `${count} ${count === 1 ? "nombre" : "nombres"}` : "Sin nominar",
              done: count >= rules.min,
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
