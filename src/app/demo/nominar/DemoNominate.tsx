"use client";

import { useState } from "react";
import { NominationBallot } from "@/app/(sala)/nominar/NominationBallot";
import { nominationBallotBytes } from "@/lib/ballots/nomination";
import type { Nominee } from "@/lib/ballots/nomination";
import { makePair } from "@/lib/ballots/nomination";
import { DEMO_ALLOW_SKIP, DEMO_CANDIDATES, DEMO_CATEGORIES, DEMO_EVENT_NAME, DEMO_ROOM_CODE } from "@/lib/demo/fixtures";
import { DemoLoading, DemoNeedsName, DemoSent } from "../DemoParts";
import { demoPause } from "@/lib/demo/pause";
import { useDemo } from "../DemoProvider";

const categories = DEMO_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  type: c.type,
  framing: c.framing,
  nomineeKind: c.nomineeKind,
  maxPicks: c.maxPicks,
  minPicks: c.minPicks,
  allowExternal: c.allowExternal,
  options: c.options.map((o) => ({ id: o.id, label: o.label, blurb: o.blurb, photoUrl: null })),
}));

/** Unos cuantos al azar de una lista (para el botón «Rellenar automáticamente»). */
function pickRandom<T>(list: readonly T[], count: number): T[] {
  return [...list].sort(() => Math.random() - 0.5).slice(0, count);
}

export function DemoNominate() {
  const { keys, self, nominationSent, saveNomination, reset } = useDemo();
  // «Ya enviaste» solo al volver al paso: justo después de enviar se ve la pantalla «¡Listo!» real.
  const [showSent, setShowSent] = useState(() => nominationSent);

  if (!self) return <DemoNeedsName action="nominar" />;
  if (!keys) return <DemoLoading label="Preparando tu papeleta…" />;
  if (showSent && nominationSent) {
    return (
      <DemoSent
        title="Ya enviaste tus nominaciones del demo"
        text="En el evento real se puede una sola vez. Aquí puedes repetirlo cuantas veces quieras."
        next={{ href: "/demo/nominados", label: "Ver nominados →" }}
        againLabel="Nominar de nuevo"
        onAgain={() => {
          reset("nomination");
          setShowSent(false);
        }}
      />
    );
  }
  return (
    <NominationBallot
      // key: si cambia el nombre, la papeleta empieza de cero.
      key={self.id}
      roomCode={`${DEMO_ROOM_CODE}-${self.id}`}
      eventName={DEMO_EVENT_NAME}
      categories={categories}
      // Nadie puede nominarse a sí mismo: su nombre no aparece en la lista.
      candidates={DEMO_CANDIDATES.filter((p) => p.id !== self.id)}
      allowSkip={DEMO_ALLOW_SKIP}
      publicKey={keys.publicKey}
      ballotBytes={nominationBallotBytes(DEMO_CATEGORIES)}
      selfName={self.name}
      onSubmit={async () => {
        // Ya va sellada con la llave del demo; no sale del navegador. La pausa
        // deja ver la carga, como cuando se envía en el evento real.
        await demoPause();
        saveNomination();
        return { ok: true };
      }}
      doneLink={{ href: "/demo/nominados", label: "Ver nominados" }}
      // Una elección al azar en cada categoría, según su tipo (nunca uno mismo).
      autofill={() => {
        const others = DEMO_CANDIDATES.filter((p) => p.id !== self.id);
        return Object.fromEntries(
          categories.map((c): [string, Nominee[]] => {
            if (c.nomineeKind === "TEXT") {
              return [c.id, [{ type: "text", text: "Ing. Ramírez" }]];
            }
            if (c.nomineeKind === "OPTION") {
              return [c.id, pickRandom(c.options, 1).map((o) => ({ type: "option", id: o.id }))];
            }
            if (c.nomineeKind === "PAIR") {
              const [a, b] = pickRandom(others, 2);
              return [c.id, [makePair(a!.id, b!.id)]];
            }
            return [c.id, pickRandom(others, 1).map((p) => ({ type: "participant", id: p.id }))];
          }),
        );
      }}
    />
  );
}
