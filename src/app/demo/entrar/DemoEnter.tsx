"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmName } from "@/components/room/ConfirmName";
import { NameGrid } from "@/components/room/NameGrid";
import { buttonClasses } from "@/components/ui/Button";
import { DEMO_CANDIDATES, DEMO_CATEGORIES, DEMO_EVENT_NAME } from "@/lib/demo/fixtures";
import { useDemo } from "../DemoProvider";

const names = DEMO_CANDIDATES.map((p) => p.name);
/** Nombres que son finalistas en alguna categoría: con ellos se ve la tarjeta «Eres tú». */
const finalistNames = new Set(DEMO_CATEGORIES.flatMap((c) => c.finalists.filter((f) => f.participantId).map((f) => f.name)));

/** La misma entrada que la sala real: tocas tu nombre y confirmas. Sin PIN. */
export function DemoEnter() {
  const { self, enter, leave } = useDemo();
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(null);

  if (self && picked === null) {
    return (
      <div className="space-y-4">
        <p className="text-ink-soft">
          Entraste como <strong className="text-ink">{self.name}</strong>.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/demo/nominar" className={buttonClasses({ className: "max-sm:w-full" })}>
            Ir a nominar →
          </Link>
          <button
            type="button"
            onClick={leave}
            className="min-h-12 px-2 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            No soy {self.name} · elegir otro nombre
          </button>
        </div>
      </div>
    );
  }

  if (picked) {
    return (
      <ConfirmName
        name={picked}
        pending={false}
        formAction={() => {
          enter(picked);
          router.push("/demo/nominar");
        }}
        onBack={() => setPicked(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        En el demo eliges a alguien del grupo ficticio de {DEMO_EVENT_NAME}. Prueba con{" "}
        {[...finalistNames].slice(0, 2).join(" o ")}: son finalistas, así que al votar verás su tarjeta como «Eres tú».
      </p>
      <NameGrid names={names} onPick={setPicked} />
    </div>
  );
}
