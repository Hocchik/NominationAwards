"use client";

import { useState } from "react";
import { NominationBallot } from "@/app/s/[roomCode]/nominar/NominationBallot";
import { nominationBallotBytes } from "@/lib/ballots/nomination";
import { DEMO_CANDIDATES, DEMO_CATEGORIES, DEMO_EVENT_NAME, DEMO_ROOM_CODE, DEMO_RULES } from "@/lib/demo/fixtures";
import { DemoLoading, DemoNeedsName, DemoSent } from "../DemoParts";
import { useDemo } from "../DemoProvider";

const categories = DEMO_CATEGORIES.map(({ id, name, description, type }) => ({ id, name, description, type }));

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
      rules={DEMO_RULES}
      publicKey={keys.publicKey}
      ballotBytes={nominationBallotBytes(DEMO_CATEGORIES.length, DEMO_RULES.max)}
      selfName={self.name}
      onSubmit={async () => {
        // Ya va sellada con la llave del demo; no sale del navegador.
        saveNomination();
        return { ok: true };
      }}
      doneLink={{ href: "/demo/nominados", label: "Ver nominados" }}
      // El mínimo de nombres en cada categoría, elegidos al azar (nunca uno mismo).
      autofill={() =>
        Object.fromEntries(
          categories.map((c) => [
            c.id,
            pickRandom(
              DEMO_CANDIDATES.filter((p) => p.id !== self.id),
              DEMO_RULES.min,
            ).map((p) => ({ type: "participant" as const, id: p.id })),
          ]),
        )
      }
    />
  );
}
