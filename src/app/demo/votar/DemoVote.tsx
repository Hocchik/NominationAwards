"use client";

import { useState } from "react";
import { VoteBallotForm } from "@/app/s/[roomCode]/votar/VoteBallotForm";
import { voteBallotBytes } from "@/lib/ballots/vote";
import { DEMO_ALLOW_ABSTENTION, DEMO_CATEGORIES, DEMO_EVENT_NAME, DEMO_ROOM_CODE, byName } from "@/lib/demo/fixtures";
import { DemoLoading, DemoNeedsName, DemoSent } from "../DemoParts";
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
        next={{ href: "/demo/nominados", label: "Ver nominados →" }}
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
      onSubmit={async () => {
        // Ya va sellado con la llave del demo; no sale del navegador.
        saveVote();
        return { ok: true };
      }}
      doneLink={{ href: "/demo/nominados", label: "Ver nominados" }}
    />
  );
}
