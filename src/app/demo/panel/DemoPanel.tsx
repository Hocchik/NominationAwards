"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEMO_CANDIDATES, byName } from "@/lib/demo/fixtures";
import { useDemo } from "../DemoProvider";

const guests = byName(DEMO_CANDIDATES);
// Amigos ficticios que ya votaron, para que la lista no esté vacía.
const SIMULATED_VOTED = new Set(guests.filter((_, i) => i % 3 !== 2).map((p) => p.id));

/**
 * Cómo ve el organizador la lista durante la votación: quién ya votó
 * (bloqueado) y el botón para botar un sobre sin abrirlo. Nunca qué votó.
 */
export function DemoPanel() {
  const { self, voteCiphertext, reset } = useDemo();
  const [othersVoted, setOthersVoted] = useState(SIMULATED_VOTED);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hasVoted = (id: string) => (id === self?.id ? voteCiphertext !== null : othersVoted.has(id));
  const voted = guests.filter((p) => hasVoted(p.id)).length;

  function resetVote(id: string, name: string) {
    if (id === self?.id) reset("vote");
    else setOthersVoted((prev) => new Set([...prev].filter((x) => x !== id)));
    setConfirming(null);
    setNotice(`Se botó el sobre de ${name} sin abrirlo. Ya puede votar de nuevo desde la sala.`);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-ink-soft uppercase">
          <span aria-hidden="true" className="size-2 bg-copper" />
          Así lo ve el organizador
        </p>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Lista de invitados</h1>
        <p className="text-ink-soft">
          Votación abierta · votaron {voted} de {guests.length}. El organizador ve quién ya votó, nunca qué votó. En la
          sala, en cambio, todos los nombres se ven iguales.
        </p>
      </div>

      <p className="border-l-[3px] border-copper bg-raised px-4 py-3 text-sm text-ink-soft">
        <strong className="text-ink">¿Alguien votó con el nombre de otro?</strong> El organizador toca «Resetear voto»:
        ese sobre se bota sin abrirlo y la persona real vuelve a votar. Al cerrar la votación los sobres pierden el
        nombre y ya no se puede resetear.
      </p>

      {notice && (
        <p role="status" className="text-sm font-semibold text-success">
          {notice}
        </p>
      )}

      <Card>
        <ul>
          {guests.map((p) => {
            const locked = hasVoted(p.id);
            return (
              <li key={p.id} className="space-y-3 border-b border-line py-2.5 last:border-b-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="font-semibold">
                    {p.name}
                    {p.id === self?.id && <span className="font-normal text-ink-soft"> (tú)</span>}
                  </span>
                  {locked && (
                    <span className="bg-ink px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.12em] text-sheet uppercase">
                      Bloqueado · ya votó
                    </span>
                  )}
                  <span className="ml-auto text-sm text-ink-soft">{locked ? "✔" : "⏳"} Votó</span>
                  {locked && confirming !== p.id && (
                    <Button variant="secondary" onClick={() => setConfirming(p.id)}>
                      Resetear voto
                    </Button>
                  )}
                </div>
                {locked && confirming === p.id && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">¿Botar el voto de {p.name} sin abrirlo?</span>
                    <Button variant="danger" onClick={() => resetVote(p.id, p.name)}>
                      Sí
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirming(null)}>
                      Cancelar
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
