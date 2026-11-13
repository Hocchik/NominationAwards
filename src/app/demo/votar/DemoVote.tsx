"use client";

import { useState } from "react";
import { VoteBallotForm } from "@/app/s/[roomCode]/votar/VoteBallotForm";
import { voteBallotBytes } from "@/lib/ballots/vote";
import { DEMO_ALLOW_ABSTENTION, DEMO_CATEGORIES, DEMO_EVENT_NAME, DEMO_ROOM_CODE, byName } from "@/lib/demo/fixtures";
import { DemoLoading, DemoNeedsName, DemoSent } from "../DemoParts";
import { useDemo } from "../DemoProvider";

export function DemoVote() {
  const { keys, self, voteCiphertext, saveVote, reset } = useDemo();
  const [showSent, setShowSent] = useState(() => voteCiphertext !== null);

  if (!self) return <DemoNeedsName action="votar" />;
  if (!keys) return <DemoLoading label="Preparando tu papeleta…" />;
  if (showSent && voteCiphertext) {
    return (
      <DemoSent
        title="Ya votaste en el demo"
        text="Tu voto sellado espera en la urna del demo. Ábrela en la ceremonia."
        next={{ href: "/demo/ceremonia", label: "Ir a la ceremonia →" }}
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
    name: c.name,
    description: c.description,
    type: c.type,
    finalists: byName(c.finalists).map((f) => ({
      id: f.id,
      name: f.name,
      photoUrl: null,
      blurb: f.blurb,
      // Tu propia tarjeta se ve, pero no se puede elegir.
      isSelf: f.participantId === self.id,
    })),
  }));

  return (
    <VoteBallotForm
      key={self.id}
      roomCode={`${DEMO_ROOM_CODE}-${self.id}`}
      eventName={DEMO_EVENT_NAME}
      categories={categories}
      allowAbstention={DEMO_ALLOW_ABSTENTION}
      publicKey={keys.publicKey}
      ballotBytes={voteBallotBytes(DEMO_CATEGORIES.length)}
      closesAt={null}
      onSubmit={async (ciphertext) => {
        // Se guarda sellado en memoria y se suma a la urna de la ceremonia del demo.
        saveVote(ciphertext);
        return { ok: true };
      }}
      doneLink={{ href: "/demo/ceremonia", label: "Ir a la ceremonia" }}
    />
  );
}
