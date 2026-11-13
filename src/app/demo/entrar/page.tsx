import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { DEMO_EVENT_NAME } from "@/lib/demo/fixtures";
import { DemoEnter } from "./DemoEnter";

export const metadata: Metadata = { title: "Demo · Entrar" };

export default function DemoEnterPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 pt-8 pb-16">
      <Card className="space-y-6">
        <div className="space-y-1">
          <p className="text-sm text-ink-soft">Te damos la bienvenida a</p>
          <h1 className="font-display text-3xl leading-tight font-extrabold">{DEMO_EVENT_NAME}</h1>
          <p className="text-sm text-ink-soft">
            Toca tu nombre para entrar. Lo que elijas es secreto: se cierra con candado en tu celular y se abre sin tu
            nombre.
          </p>
        </div>
        <DemoEnter />
      </Card>
    </main>
  );
}
