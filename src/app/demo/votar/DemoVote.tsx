"use client";

import { useState } from "react";
import { VoteBallotForm } from "@/app/(sala)/votar/VoteBallotForm";
import { voteBallotBytes } from "@/lib/ballots/vote";
import { categoryTitle } from "@/lib/event/categoryKinds";
import { DEMO_CATEGORIES, DEMO_EVENT_NAME, DEMO_ROOM_CODE, byName, demoFinalistDisplay } from "@/lib/demo/fixtures";
import { DemoLoading, DemoNeedsName, DemoSent } from "../DemoParts";
import { demoPause } from "@/lib/demo/pause";
import { useDemo } from "../DemoProvider";

export function DemoVote() {
  const { keys, self, voteSent, saveVote, reset } = useDemo();
  const [showSent, setShowSent] = useState(() => voteSent);

  if (!self) return <DemoNeedsName action="votar" />;
  if (!keys) return <DemoLoading label="Preparando tu papeleta…" />;
  if (showSent && voteSent) {
    return (
      <DemoSent
        title="Ya votaste en el demo"
        text="En el evento real se vota una sola vez. Aquí puedes repetirlo cuantas veces quieras."
        next={{ href: "/demo/ganador", label: "Ver un ejemplo de la ceremonia →" }}
        againLabel="Votar de nuevo"
        onAgain={() => {
          reset("vote");
          setShowSent(false);
        }}
      />
    );
  }

  const categories = DEMO_CATEGORIES.map((c) => ({
    id: c.id,
    name: categoryTitle(c),
    description: c.description,
    type: c.type,
    finalists: byName(c.finalists).map((f) => {
      const shown = demoFinalistDisplay(f, c.nomineeKind);
      return {
        id: f.id,
        name: f.name,
        photoUrl: null,
        partnerPhotoUrl: null,
        kind: shown.kind,
        blurb: f.blurb || null,
        // Tu propia tarjeta (o una pareja en la que estás) se ve, pero no se puede elegir.
        isSelf: f.participantId === self.id || f.partnerParticipantId === self.id,
      };
    }),
  }));

  return (
    <VoteBallotForm
      key={self.id}
      roomCode={`${DEMO_ROOM_CODE}-${self.id}`}
      eventName={DEMO_EVENT_NAME}
      categories={categories}
      publicKey={keys.publicKey}
      ballotBytes={voteBallotBytes(DEMO_CATEGORIES.length)}
      closesAt={null}
      onSubmit={async () => {
        // Ya va sellado con la llave del demo; no sale del navegador. La pausa
        // deja ver la carga, como cuando se envía en el evento real.
        await demoPause();
        saveVote();
        return { ok: true };
      }}
      doneLink={{ href: "/demo/ganador", label: "Ver un ejemplo de la ceremonia" }}
      // Un finalista al azar por categoría (nunca la propia tarjeta).
      autofill={() =>
        Object.fromEntries(
          categories.map((c) => {
            const options = c.finalists.filter((f) => !f.isSelf);
            return [c.id, options[Math.floor(Math.random() * options.length)]?.id ?? null];
          }),
        )
      }
    />
  );
}
