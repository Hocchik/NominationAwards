"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type { CategoryFraming, CategoryType } from "@/generated/prisma/enums";
import { type NominationBallot, nominationBallotSchema } from "@/lib/ballots/nomination";
import {
  type NomineeKey,
  type Tally,
  type TallyCategory,
  countMerged,
  resolveMerge,
  splitAtCut,
  tallyNominations,
  textEntries,
} from "@/lib/ballots/tally";
import { parseKeyFile } from "@/lib/crypto/keyFile";
import type { KeyPair } from "@/lib/crypto/keys";
import { openPayload } from "@/lib/crypto/open";
import { categoryTitle } from "@/lib/event/categoryKinds";
import { MAX_FINALISTS } from "@/lib/event/rules";
import { getNominationBallotsAction, saveFinalistsAction } from "../../closing-actions";

// Todo lo de esta pantalla pasa en ESTE navegador (regla 7): la llave privada
// y los conteos viven solo en memoria y desaparecen al cerrar la pestaña.
// La pantalla nunca muestra conteos (regla 8).

interface CategoryInfo extends TallyCategory {
  name: string;
  type: CategoryType;
  framing: CategoryFraming;
  /** Cuántos pasan a la votación (3, 4 o 5). */
  finalistCount: number;
  /** Solo en las de finalistas directos: las opciones que pasan tal cual. */
  directOptions: { id: string; label: string }[];
}

interface ChosenFinalist {
  name: string;
  participantId: string | null;
  partnerParticipantId: string | null;
  optionId: string | null;
}

type Step = "key" | "unify" | "finalists";

/**
 * Qué hacer cuando el empate del último puesto se pasa del número de finalistas:
 * que entren todos, elegir cuáles completan o quedarse solo con los de arriba.
 */
type TieMode = "all" | "pick" | "top";
interface TieChoiceValue {
  mode: TieMode;
  picked: NomineeKey[];
}

/**
 * La elección que vale para un empate: si «que entren todos» pasaría del tope de
 * 5, no se ofrece y se arranca eligiendo entre los empatados.
 */
function effectiveTie(value: TieChoiceValue | undefined, sure: number, tied: number): TieChoiceValue {
  const allFits = sure + tied <= MAX_FINALISTS;
  if (!value) return { mode: allFits ? "all" : "pick", picked: [] };
  if (value.mode === "all" && !allFits) return { ...value, mode: "pick" };
  return value;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "es");

export function ClosingFlow({
  publicKey,
  ballotCount,
  categories,
  participantNames,
  optionLabels,
}: {
  publicKey: string;
  ballotCount: number;
  categories: CategoryInfo[];
  participantNames: Record<string, string>;
  /** Opciones del organizador (profes, eventos, frases): id → texto. */
  optionLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("key");
  const [keys, setKeys] = useState<KeyPair | null>(null);
  const [tally, setTally] = useState<Tally | null>(null);
  const [unreadable, setUnreadable] = useState(0);
  const [merges, setMerges] = useState<Record<NomineeKey, NomineeKey>>({});
  // Texto libre, por categoría: qué variantes son lo mismo y cómo se verá cada grupo.
  const [textMerges, setTextMerges] = useState<Record<string, Record<NomineeKey, NomineeKey>>>({});
  const [textNames, setTextNames] = useState<Record<string, Record<NomineeKey, string>>>({});
  const [ties, setTies] = useState<Record<string, TieChoiceValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function loadKey(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const parsed = await parseKeyFile(await file.text());
      if (parsed.nomination.publicKey !== publicKey) {
        throw new Error("Este archivo de llaves no corresponde a este evento.");
      }
      setKeys(parsed.nomination); // solo la llave de nominaciones; la de votación ni se toca
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }

  function openBallots() {
    if (!keys) return;
    setError(null);
    startTransition(async () => {
      const result = await getNominationBallotsAction();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const ballots: NominationBallot[] = [];
      let failed = 0;
      for (const ciphertext of result.ciphertexts) {
        try {
          const parsed = nominationBallotSchema.safeParse(await openPayload(ciphertext, keys));
          if (parsed.success) ballots.push(parsed.data);
          else failed++;
        } catch {
          failed++;
        }
      }
      setTally(tallyNominations(ballots, categories, participantNames, optionLabels));
      setUnreadable(failed);
      setKeys(null); // la llave privada se borra de la memoria apenas termina
      setStep("unify");
    });
  }

  // Solo las personas sueltas se pueden unificar (parejas y opciones ya son exactas).
  const entries = useMemo(
    () =>
      tally
        ? Object.values(tally.entries)
            .filter((e) => e.key.startsWith("p:") || e.key.startsWith("x:"))
            .sort(byName)
        : [],
    [tally],
  );
  const hasExternal = entries.some((e) => !e.participantId);
  const textCategories = categories.filter((c) => c.nomineeKind === "TEXT");

  const finalists = useMemo((): {
    category: CategoryInfo;
    list: ChosenFinalist[];
    sure: string[];
    tied: { key: NomineeKey; name: string }[];
  }[] => {
    if (!tally) return [];
    return categories.map((category) => {
      if (category.nomineeKind === "DIRECT") {
        const list = category.directOptions.map((o) => ({ name: o.label, participantId: null, partnerParticipantId: null, optionId: o.id }));
        return { category, list: list.sort(byName), sure: [], tied: [] };
      }
      const text = category.nomineeKind === "TEXT";
      const names = textNames[category.id] ?? {};
      const toFinalist = (key: NomineeKey): ChosenFinalist | null => {
        const entry = tally.entries[key];
        if (!entry) return null;
        if (!text) return entry;
        const name = (names[key] ?? entry.name).trim() || entry.name;
        return { name, participantId: null, partnerParticipantId: null, optionId: null };
      };
      const counts = countMerged(tally, category.id, text ? (textMerges[category.id] ?? {}) : merges);
      const { sure, tied } = splitAtCut(counts, category.finalistCount);
      const choice = effectiveTie(ties[category.id], sure.length, tied.length);
      const chosenTied = choice.mode === "all" ? tied : choice.mode === "pick" ? tied.filter((key) => choice.picked.includes(key)) : [];
      const list = [...sure, ...chosenTied]
        .map(toFinalist)
        .filter((f): f is ChosenFinalist => f !== null)
        .sort(byName);
      return {
        category,
        list,
        sure: sure.map((key) => toFinalist(key)?.name ?? "").filter(Boolean).sort((a, b) => a.localeCompare(b, "es")),
        tied: tied
          .map((key) => ({ key, name: toFinalist(key)?.name ?? "" }))
          .filter((t) => t.name)
          .sort(byName),
      };
    });
  }, [tally, merges, categories, textMerges, textNames, ties]);

  // Elegir entre empatados sin marcar a nadie (o pasando de 5) dejaría la categoría mal armada.
  const pendingTie = finalists.find(({ category, sure, tied }) => {
    if (tied.length === 0) return false;
    const choice = effectiveTie(ties[category.id], sure.length, tied.length);
    if (choice.mode !== "pick") return false;
    const picked = tied.filter((t) => choice.picked.includes(t.key)).length;
    return picked === 0 || sure.length + picked > MAX_FINALISTS;
  });

  function save() {
    setError(null);
    if (pendingTie) {
      setError(`En «${categoryTitle(pendingTie.category)}» marca entre los empatados (al menos 1, máximo ${MAX_FINALISTS} finalistas en total), o elige otra opción.`);
      return;
    }
    startTransition(async () => {
      const result = await saveFinalistsAction(
        finalists.map(({ category, list }) => ({
          categoryId: category.id,
          finalists: list.map((entry) => ({
            name: entry.name.slice(0, 200),
            participantId: entry.participantId,
            partnerParticipantId: entry.partnerParticipantId,
            optionId: entry.optionId,
          })),
        })),
      );
      if (!result.ok) {
        setError(result.message ?? "No se pudieron guardar los finalistas.");
        return;
      }
      router.push("/admin/finalistas");
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Cierre de nominaciones</h1>
        <p className="text-sm text-ink-soft">
          Lo hace el notario con su archivo de llaves, idealmente en su propio dispositivo. Las
          papeletas se abren aquí, en el navegador; al servidor solo vuelven los finalistas, sin
          conteos.
        </p>
      </div>

      {step === "key" && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">1. Carga el archivo de llaves del notario</h2>
          <p className="text-sm text-ink-soft">
            Hay {ballotCount === 1 ? "1 papeleta" : `${ballotCount} papeletas`} en la urna. El
            archivo no se sube a ningún lado: se lee en este navegador y la llave se olvida al
            terminar.
          </p>
          {!keys ? (
            <label className="border border-line bg-sheet inline-flex min-h-12 cursor-pointer items-center px-5 text-sm font-semibold">
              Elegir archivo de llaves…
              <input type="file" accept="application/json,.json" onChange={loadKey} className="sr-only" />
            </label>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-success">✓ Archivo correcto para este evento.</p>
              <Button onClick={openBallots} disabled={pending}>
                {pending ? "Abriendo papeletas…" : "Abrir papeletas"}
              </Button>
            </div>
          )}
        </Card>
      )}

      {step === "unify" && tally && (
        <Card className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">2. Unifica nombres repetidos</h2>
            <p className="text-sm text-ink-soft">
              Todo lo que escribió el grupo, en orden alfabético y sin conteos ni autor. Si dos son
              la misma persona o la misma frase (por ejemplo, «Profe Ramírez» e «Ing. Ramírez»),
              une uno con el otro: sus nominaciones se suman y una papeleta que puso las dos cuenta
              una sola vez. Después el sistema saca los finalistas solo.
            </p>
            {unreadable > 0 && (
              <p className="text-sm text-danger">
                {unreadable === 1 ? "1 papeleta no se pudo abrir" : `${unreadable} papeletas no se pudieron abrir`} y no se cuenta.
              </p>
            )}
          </div>
          {textCategories.map((category) => (
            <TextGroups
              key={category.id}
              title={categoryTitle(category)}
              entries={textEntries(tally, category.id)}
              merges={textMerges[category.id] ?? {}}
              names={textNames[category.id] ?? {}}
              onMerge={(next) => setTextMerges((prev) => ({ ...prev, [category.id]: next }))}
              onRename={(next) => setTextNames((prev) => ({ ...prev, [category.id]: next }))}
            />
          ))}
          {hasExternal && <h3 className="font-semibold">Personas de fuera del grupo</h3>}
          {!hasExternal ? (
            textCategories.length === 0 && (
              <p className="text-sm text-ink-soft">
                Nadie escribió nombres de fuera del grupo: no hay nada que unificar. Sigue al paso 3.
              </p>
            )
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((entry) => {
                const target = resolveMerge(entry.key, merges);
                return (
                  <li key={entry.key} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="min-w-40 flex-1 font-medium">
                      {entry.name}{" "}
                      <span className="text-xs font-normal text-ink-soft">
                        {entry.participantId ? "del grupo" : "de fuera"}
                      </span>
                    </span>
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-ink-soft">Es la misma persona que</span>
                      <select
                        value={merges[entry.key] ?? ""}
                        onChange={(e) =>
                          setMerges((prev) => {
                            const next = { ...prev };
                            if (e.target.value) next[entry.key] = e.target.value;
                            else delete next[entry.key];
                            return next;
                          })
                        }
                        className="border border-line bg-sheet min-h-11 px-3 text-sm text-ink"
                      >
                        <option value="" className="bg-bg">
                          — nadie más —
                        </option>
                        {entries
                          .filter((other) => other.key !== entry.key)
                          .map((other) => (
                            <option key={other.key} value={other.key} className="bg-bg">
                              {other.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    {target !== entry.key && (
                      <span className="w-full text-xs text-ink-soft">
                        Se cuenta como {tally.entries[target]?.name}.
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Button onClick={() => setStep("finalists")}>Calcular finalistas →</Button>
        </Card>
      )}

      {step === "finalists" && (
        <Card className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">3. Revisa los finalistas</h2>
            <p className="text-sm text-ink-soft">
              Los más nominados de cada categoría (3, 4 o 5, según la categoría), en orden
              alfabético y sin conteos. Si el empate del último puesto hace pasar del número,
              decides tú en esa categoría: que entren todos, elegir cuáles completan o quedarte con
              los de arriba. En las de texto libre se cuentan los grupos que armaste en el paso 2.
              Las de finalistas directos pasan con las opciones que cargaste.
            </p>
          </div>
          <ol className="space-y-3">
            {finalists.map(({ category, list, sure, tied }) => (
              <li key={category.id} className=" border border-line px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{categoryTitle(category)}</span>
                  <Chip size="sm" tone={category.type === "PRIZE" ? "copper" : "sage"}>
                    {category.type === "PRIZE" ? "Premio" : "Honorífica"}
                  </Chip>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {list.length
                    ? list.map((e) => e.name).join(" · ")
                    : category.nomineeKind === "DIRECT"
                      ? "Todavía no cargaste las opciones de esta categoría en Categorías."
                      : "Sin nominaciones: no tendrá finalistas."}
                </p>
                {tied.length > 0 && (
                  <TieChoice
                    name={category.id}
                    target={category.finalistCount}
                    sure={sure}
                    tied={tied}
                    value={effectiveTie(ties[category.id], sure.length, tied.length)}
                    onChange={(value) => setTies((prev) => ({ ...prev, [category.id]: value }))}
                  />
                )}
              </li>
            ))}
          </ol>
          <p className="text-xs text-ink-soft">
            Al guardar, el evento pasa a «Finalistas listos». Los conteos no se guardan en ningún
            lado: si cierras esta pestaña antes, habrá que volver a cargar la llave.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setStep("unify")} disabled={pending}>
              ← Volver a unificar
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Guardando…" : "Guardar finalistas"}
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Lo que escribió el grupo en una categoría de texto libre, en orden alfabético
 * y sin conteos ni autor (regla 8). El organizador une las variantes que son lo
 * mismo («ing. ramirez» → «Ing. Ramírez») y corrige cómo se verá cada grupo; los
 * finalistas los saca el sistema contando los grupos.
 */
function TextGroups({
  title,
  entries,
  merges,
  names,
  onMerge,
  onRename,
}: {
  title: string;
  entries: { key: string; name: string }[];
  merges: Record<string, string>;
  names: Record<string, string>;
  onMerge: (merges: Record<string, string>) => void;
  onRename: (names: Record<string, string>) => void;
}) {
  const groups = new Set(entries.map((entry) => resolveMerge(entry.key, merges))).size;
  const nameOf = (key: string) => names[key] ?? entries.find((entry) => entry.key === key)?.name ?? "";
  return (
    <section className="space-y-2 border border-line px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-ink-soft">
          {entries.length === 0
            ? "Nadie escribió nada"
            : `${entries.length} ${entries.length === 1 ? "texto distinto" : "textos distintos"} · ${groups} ${groups === 1 ? "grupo" : "grupos"}`}
        </span>
      </div>
      {entries.length > 0 && (
        <ul className="divide-y divide-line">
          {entries.map((entry) => {
            const target = resolveMerge(entry.key, merges);
            const head = target === entry.key;
            return (
              <li key={entry.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                <span className={head ? "min-w-40 flex-1 font-medium" : "min-w-40 flex-1 text-ink-soft"}>«{entry.name}»</span>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-ink-soft">Es lo mismo que</span>
                  <select
                    value={merges[entry.key] ?? ""}
                    onChange={(event) => {
                      const next = { ...merges };
                      if (event.target.value) next[entry.key] = event.target.value;
                      else delete next[entry.key];
                      onMerge(next);
                    }}
                    className="min-h-11 max-w-60 border border-line bg-sheet px-3 text-sm text-ink"
                  >
                    <option value="" className="bg-bg">
                      — nada más —
                    </option>
                    {entries
                      .filter((other) => other.key !== entry.key)
                      .map((other) => (
                        <option key={other.key} value={other.key} className="bg-bg">
                          {other.name}
                        </option>
                      ))}
                  </select>
                </label>
                {head ? (
                  <label className="flex w-full items-center gap-2 text-xs text-ink-soft">
                    <span className="shrink-0">Se verá como</span>
                    <input
                      value={nameOf(entry.key)}
                      maxLength={200}
                      onChange={(event) => onRename({ ...names, [entry.key]: event.target.value })}
                      className="min-h-11 w-full border border-line bg-sheet px-3 text-sm text-ink sm:w-80"
                    />
                  </label>
                ) : (
                  <span className="w-full text-xs text-ink-soft">Se cuenta como «{nameOf(target)}».</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Empate en el último puesto que se pasa del número de finalistas. Solo dice
 * quiénes entran fijos y quiénes están empatados en el corte, nunca cuántas
 * nominaciones tuvo nadie (decisión del usuario, 2026-11-25).
 */
function TieChoice({
  name,
  target,
  sure,
  tied,
  value,
  onChange,
}: {
  name: string;
  target: number;
  sure: string[];
  tied: { key: string; name: string }[];
  value: TieChoiceValue;
  onChange: (value: TieChoiceValue) => void;
}) {
  const missing = Math.max(0, target - sure.length);
  const picked = tied.filter((t) => value.picked.includes(t.key)).length;
  const room = MAX_FINALISTS - sure.length;
  const options: { mode: TieMode; label: string }[] = [];
  if (sure.length + tied.length <= MAX_FINALISTS) {
    options.push({ mode: "all", label: `Que entren los ${tied.length} empatados (${sure.length + tied.length} finalistas)` });
  }
  options.push({ mode: "pick", label: "Elijo cuáles entran de los empatados" });
  if (sure.length >= 2) options.push({ mode: "top", label: `Quedarme con los ${sure.length} de arriba` });
  return (
    <fieldset className="mt-3 space-y-2 border-l-2 border-copper pl-3">
      <legend className="text-sm font-semibold">Empate en el último puesto</legend>
      <p className="text-xs text-ink-soft">
        {sure.length === 0
          ? "Nadie quedó claramente arriba"
          : `${sure.length === 1 ? "Entra fijo" : `Entran fijos ${sure.length}`}: ${sure.join(", ")}`}
        . {tied.length} empatados por {missing === 1 ? "1 lugar" : `${missing} lugares`}. No se muestra cuántas nominaciones tuvo nadie.
        {sure.length + tied.length > MAX_FINALISTS && ` Como pasarían de ${MAX_FINALISTS}, no pueden entrar todos.`}
      </p>
      <div className="space-y-1">
        {options.map((option) => (
          <label key={option.mode} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="radio"
              name={`empate-${name}`}
              checked={value.mode === option.mode}
              onChange={() => onChange({ ...value, mode: option.mode })}
              className="size-4 shrink-0 accent-copper"
            />
            {option.label}
          </label>
        ))}
      </div>
      {value.mode === "pick" && (
        <div className="space-y-1 pl-6">
          <p className="text-xs text-ink-soft">
            Elegiste {picked} ·{" "}
            {picked >= missing
              ? `ya son ${sure.length + picked} finalistas`
              : `para llegar a ${target} ${missing - picked === 1 ? "falta 1" : `faltan ${missing - picked}`}`}
            {picked < room && ` · puedes sumar ${room - picked === 1 ? "1 más" : `${room - picked} más`} (máximo ${MAX_FINALISTS})`}
          </p>
          {tied.map((t) => {
            const on = value.picked.includes(t.key);
            return (
              <label key={t.key} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!on && picked >= room}
                  onChange={() =>
                    onChange({ ...value, picked: on ? value.picked.filter((k) => k !== t.key) : [...value.picked, t.key] })
                  }
                  className="size-4 shrink-0 accent-copper"
                />
                <span className={on ? "font-semibold" : undefined}>{t.name}</span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
