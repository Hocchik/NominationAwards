"use client";

import { useState } from "react";
import { NominationBallot } from "@/app/s/[roomCode]/nominar/NominationBallot";
import { nominationBallotBytes } from "@/lib/ballots/nomination";
import {
  DEMO_CANDIDATES,
  DEMO_CATEGORIES,
  DEMO_EVENT_NAME,
  DEMO_ROOM_CODE,
  DEMO_RULES,
  DEMO_SELF_NAME,
} from "@/lib/demo/fixtures";
import { DemoLoading, DemoSent } from "../DemoParts";
import { useDemo } from "../DemoProvider";

const categories = DEMO_CATEGORIES.map(({ id, name, description, type }) => ({ id, name, description, type }));

export function DemoNominate() {
  const { keys, nominationReceipt, saveNomination, reset } = useDemo();
  // «Ya enviaste» solo al volver al paso: justo después de enviar se ve la pantalla sellada real.
  const [showSent, setShowSent] = useState(() => nominationReceipt !== null);

  if (!keys) return <DemoLoading label="Preparando tu papeleta…" />;
  if (showSent && nominationReceipt) {
    return (
      <DemoSent
        title="Ya enviaste tus nominaciones del demo"
        text="En el evento real se puede una sola vez. Aquí puedes repetirlo cuantas veces quieras."
        code={nominationReceipt}
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
      roomCode={DEMO_ROOM_CODE}
      eventName={DEMO_EVENT_NAME}
      categories={categories}
      candidates={DEMO_CANDIDATES}
      rules={DEMO_RULES}
      publicKey={keys.publicKey}
      ballotBytes={nominationBallotBytes(DEMO_CATEGORIES.length, DEMO_RULES.max)}
      selfName={DEMO_SELF_NAME}
      onSubmit={async (_ciphertext, receipt) => {
        // Ya va sellada con la llave del demo; no sale del navegador.
        saveNomination(receipt);
        return { ok: true };
      }}
      doneLink={{ href: "/demo/nominados", label: "Ver nominados" }}
    />
  );
}
