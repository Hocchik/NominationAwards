"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type { CategoryType } from "@/generated/prisma/enums";
import { type NominationBallot, nominationBallotSchema } from "@/lib/ballots/nomination";
import {
  type NomineeKey,
  type Tally,
  applyMerges,
  pickFinalists,
  resolveMerge,
  tallyNominations,
} from "@/lib/ballots/tally";
import { parseKeyFile } from "@/lib/crypto/keyFile";
import type { KeyPair } from "@/lib/crypto/keys";
import { openPayload } from "@/lib/crypto/open";
import { getNominationBallotsAction, saveFinalistsAction } from "../../closing-actions";

// Todo lo de esta pantalla pasa en ESTE navegador (regla 7): la llave privada
// y los conteos viven solo en memoria y desaparecen al cerrar la pestaña.
// La pantalla nunca muestra conteos (regla 8).

interface CategoryInfo {
  id: string;
  name: string;
  type: CategoryType;
}

type Step = "key" | "unify" | "finalists";

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "es");

export function ClosingFlow({
  publicKey,
  finalistsPerCategory,
  ballotCount,
  categories,
  participantNames,
}: {
  publicKey: string;
  finalistsPerCategory: number;
  ballotCount: number;
  categories: CategoryInfo[];
  participantNames: Record<string, string>;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("key");
  const [keys, setKeys] = useState<KeyPair | null>(null);
  const [tally, setTally] = useState<Tally | null>(null);
  const [unreadable, setUnreadable] = useState(0);
  const [merges, setMerges] = useState<Record<NomineeKey, NomineeKey>>({});
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
      setTally(tallyNominations(ballots, categories.map((c) => c.id), participantNames));
      setUnreadable(failed);
      setKeys(null); // la llave privada se borra de la memoria apenas termina
      setStep("unify");
    });
  }

  const entries = useMemo(() => (tally ? Object.values(tally.entries).sort(byName) : []), [tally]);

  const finalists = useMemo(() => {
    if (!tally) return [];
    return categories.map((category) => {
      const keysForCategory = pickFinalists(applyMerges(tally.counts[category.id] ?? {}, merges), finalistsPerCategory);
      const list = keysForCategory.map((key) => tally.entries[key]).filter(Boolean).sort(byName);
      return { category, list };
    });
  }, [tally, merges, categories, finalistsPerCategory]);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveFinalistsAction(
        finalists.map(({ category, list }) => ({
          categoryId: category.id,
          finalists: list.map((entry) => ({ name: entry.name, participantId: entry.participantId })),
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
              Todos los nombres que aparecieron, en orden alfabético y sin conteos. Si dos son la
              misma persona (por ejemplo, «Tía Rosa» y «La tía Rosa»), une uno con el otro y sus
              nominaciones se suman.
            </p>
            {unreadable > 0 && (
              <p className="text-sm text-danger">
                {unreadable === 1 ? "1 papeleta no se pudo abrir" : `${unreadable} papeletas no se pudieron abrir`} y no se cuenta.
              </p>
            )}
          </div>
          {entries.length === 0 ? (
            <p className="text-sm text-ink-soft">No hay nominaciones.</p>
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
              Los {finalistsPerCategory} más nominados de cada categoría, en orden alfabético. Si
              hubo empate en el último puesto, entran todos los empatados.
            </p>
          </div>
          <ol className="space-y-3">
            {finalists.map(({ category, list }) => (
              <li key={category.id} className=" border border-line px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{category.name}</span>
                  <Chip size="sm" tone={category.type === "PRIZE" ? "copper" : "sage"}>
                    {category.type === "PRIZE" ? "Premio" : "Honorífica"}
                  </Chip>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {list.length ? list.map((e) => e.name).join(" · ") : "Sin nominaciones: no tendrá finalistas."}
                </p>
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
