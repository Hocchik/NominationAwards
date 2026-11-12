"use client";

import Link from "next/link";
import { type BoardCategory, NomineesBoard } from "@/app/s/[roomCode]/nominados/NomineesBoard";
import { buttonClasses } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import { DEMO_CATEGORIES, byName } from "@/lib/demo/fixtures";
import { useDemo } from "../DemoProvider";

// Finalistas en orden alfabético y sin conteos, como la cartelera real (regla 8).
const board: BoardCategory[] = DEMO_CATEGORIES.map((c, i) => ({
  id: c.id,
  num: String(i + 1).padStart(2, "0"),
  name: c.name,
  description: c.description,
  type: c.type,
  finalists: byName(c.finalists).map((f) => ({
    id: f.id,
    name: f.name,
    photoUrl: null,
    blurb: f.blurb,
    external: f.participantId === null,
  })),
}));
const totalFinalists = board.reduce((sum, c) => sum + c.finalists.length, 0);

export function DemoNominees() {
  const { votingOpensAt } = useDemo();
  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 pt-1 lg:pt-4">
        <div className="max-w-[36rem] flex-[1_1_28rem] space-y-2.5 lg:space-y-3">
          <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-ink-soft uppercase lg:text-[13px]">
            <span className="size-2 bg-copper" aria-hidden="true" />
            Pronto la votación final
          </p>
          <h1 className="font-display text-[34px] leading-[0.95] font-extrabold uppercase sm:text-5xl lg:text-[64px]">
            Los nominados
          </h1>
          <p className="text-ink-soft lg:text-[17px] lg:leading-normal">
            {totalFinalists} nominados en {board.length} categorías, en orden alfabético y sin conteos. En el evento real
            salen de lo que nominó el grupo; aquí son de ejemplo.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {votingOpensAt && <Countdown title="La votación abre en" target={votingOpensAt} />}
          <Link href="/demo/votar" className={buttonClasses({ size: "lg", className: "max-sm:w-full" })}>
            Ir a votar →
          </Link>
        </div>
      </section>

      <NomineesBoard revealed categories={board} slots={4} revealNote="Se revela pronto" />
    </>
  );
}
