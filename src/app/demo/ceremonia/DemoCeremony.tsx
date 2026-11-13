"use client";

import Link from "next/link";
import { CeremonyShow } from "@/app/ceremonia/CeremonyShow";
import { voteBallotBytes } from "@/lib/ballots/vote";
import {
  DEMO_CATEGORIES,
  DEMO_EVENT_NAME,
  DEMO_SIMULATED_VOTES,
  DEMO_VOTERS,
  byName,
  demoRevealOrder,
} from "@/lib/demo/fixtures";
import { sealDemoUrn } from "@/lib/demo/simulate";
import { DemoLoading } from "../DemoParts";
import { useDemo } from "../DemoProvider";

const categories = demoRevealOrder().map((c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  type: c.type,
  finalists: byName(c.finalists).map((f) => ({ id: f.id, name: f.name, photoUrl: null, blurb: f.blurb })),
}));

export function DemoCeremony() {
  const { keys, voteCiphertext } = useDemo();

  if (!keys) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
        <DemoLoading label="Preparando la ceremonia…" />
      </main>
    );
  }

  const intro = voteCiphertext ? (
    <>
      Se abren tu voto y los de {DEMO_VOTERS} amigos ficticios, aquí en tu navegador, con la llave del demo. Los
      sobres ya no llevan nombre: se arrancaron al cerrar la votación.
    </>
  ) : (
    <>
      Todavía no votaste: la urna se abre igual, solo con los votos de {DEMO_VOTERS} amigos ficticios.{" "}
      <Link href="/demo/votar" className="font-semibold text-ink underline decoration-copper decoration-2 underline-offset-4">
        Votar primero
      </Link>
    </>
  );

  return (
    <CeremonyShow
      eventName={DEMO_EVENT_NAME}
      publicKey={keys.publicKey}
      showWinnerPercent={false}
      categories={categories}
      intro={intro}
      openBallots={async () => ({
        keys,
        ciphertexts: await sealDemoUrn({
          keys,
          table: DEMO_SIMULATED_VOTES,
          voters: DEMO_VOTERS,
          ballotBytes: voteBallotBytes(DEMO_CATEGORIES.length),
          extra: voteCiphertext,
        }),
      })}
    />
  );
}
