"use client";

import { useState } from "react";
import { VoteBallotForm } from "@/app/s/[roomCode]/votar/VoteBallotForm";
import { voteBallotBytes } from "@/lib/ballots/vote";
import { DEMO_ALLOW_ABSTENTION, DEMO_CATEGORIES, DEMO_EVENT_NAME, DEMO_ROOM_CODE, byName } from "@/lib/demo/fixtures";
import { DemoLoading, DemoSent } from "../DemoParts";
import { useDemo } from "../DemoProvider";

const categories = DEMO_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  type: c.type,
  finalists: byName(c.finalists).map((f) => ({ id: f.id, name: f.name, photoUrl: null, blurb: f.blurb })),
}));

export function DemoVote() {
  const { keys, vote, saveVote, reset } = useDemo();
  const [showSent, setShowSent] = useState(() => vote !== null);

  if (!keys) return <DemoLoading label="Preparando tu papeleta…" />;
  if (showSent && vote) {
    return (
      <DemoSent
        title="Ya votaste en el demo"
        text="Tu voto sellado espera en la urna del demo. Ábrela en la ceremonia y busca tu comprobante."
        code={vote.receipt}
        next={{ href: "/demo/ceremonia", label: "Ir a la ceremonia →" }}
        againLabel="Votar de nuevo"
        onAgain={() => {
          reset("vote");
          setShowSent(false);
        }}
      />
    );
  }
  return (
    <VoteBallotForm
      roomCode={DEMO_ROOM_CODE}
      eventName={DEMO_EVENT_NAME}
      categories={categories}
      allowAbstention={DEMO_ALLOW_ABSTENTION}
      publicKey={keys.publicKey}
      ballotBytes={voteBallotBytes(DEMO_CATEGORIES.length)}
      closesAt={null}
      onSubmit={async (ciphertext, receipt) => {
        // Se guarda sellado en memoria y se suma a la urna de la ceremonia del demo.
        saveVote({ receipt, ciphertext });
        return { ok: true };
      }}
      doneLink={{ href: "/demo/ceremonia", label: "Ir a la ceremonia" }}
    />
  );
}
