import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { isBefore } from "@/lib/event/phases";
import { getCurrentEvent } from "@/lib/event/queries";
import { revealSequence } from "@/lib/event/reveal";
import { canEditRevealOrder, canEditVoteRules } from "@/lib/event/rules";
import { setCategoryActiveAction } from "../../finalist-actions";
import { PanelLoading } from "../../_components/PanelLoading";
import { RevealOrderEditor } from "../../_components/RevealOrderEditor";
import { SectionCard } from "../../_components/SectionCard";
import { categoryTitle } from "@/lib/event/categoryKinds";
import { FinalistCard } from "./FinalistCard";

export const metadata: Metadata = { title: "Finalistas" };

export default function FinalistsPage() {
  return (
    <Suspense fallback={<PanelLoading />}>
      <FinalistsPanel />
    </Suspense>
  );
}

async function FinalistsPanel() {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event || isBefore(event.phase, "FINALISTS_READY")) {
    return (
      <Card className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Finalistas</h1>
        <p className="text-sm text-ink-soft">
          Aparecen después del{" "}
          <Link href="/admin/cierre-nominaciones" className="font-semibold text-ink underline decoration-copper decoration-2 underline-offset-4">
            cierre de nominaciones
          </Link>
          .
        </p>
      </Card>
    );
  }

  // Finalistas en orden alfabético: nunca en un orden que insinúe conteos (regla 8).
  const categories = await prisma.category.findMany({
    where: { eventId: event.id },
    orderBy: { sortOrder: "asc" },
    include: { finalists: { orderBy: { displayName: "asc" } } },
  });
  const votingRulesEditable = canEditVoteRules(event.phase);
  const finalistsEditable = isBefore(event.phase, "CEREMONY");
  const active = categories.filter((c) => c.activeForVote);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const activePrize = active.filter((c) => c.type === "PRIZE").length;
  const activeHonorary = active.length - activePrize;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Finalistas</h1>
        <p className="text-sm text-ink-soft">
          En la votación: {activePrize} de premio (máximo {event.maxPrizeCategories}) ·{" "}
          {activeHonorary} {activeHonorary === 1 ? "honorífica" : "honoríficas"}. Los finalistas
          están en orden alfabético y sin conteos.
        </p>
        {!votingRulesEditable && (
          <p className="text-sm text-ink-soft">La votación ya empezó: las categorías activas quedan fijas (el orden de la ceremonia se puede mover hasta que empiece).</p>
        )}
      </div>

      <SectionCard
        id="activas"
        title="Categorías en la votación"
        description="Activa las que pasan a la votación final. Las de premio tienen tope; las honoríficas no. Al activar una, sus nominados se publican en la página de Nominados de la sala: carga antes las fotos (las frases cortas se ven solo en la papeleta de votación)."
      >
        <ul className="divide-y divide-line">
          {categories.map((category) => {
            const isPrize = category.type === "PRIZE";
            const full = isPrize && !category.activeForVote && activePrize >= event.maxPrizeCategories;
            const empty = category.finalists.length === 0;
            return (
              <li key={category.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-40 flex-1">
                  <span className="font-medium">{categoryTitle(category)}</span>{" "}
                  <Chip size="sm" tone={isPrize ? "copper" : "sage"}>
                    {isPrize ? "Premio" : "Honorífica"}
                  </Chip>
                  <span className="block text-xs text-ink-soft">
                    {empty
                      ? "Sin finalistas"
                      : category.finalists.length === 1
                        ? "1 finalista (ganaría sin competencia)"
                        : `${category.finalists.length} finalistas`}
                  </span>
                </span>
                {votingRulesEditable ? (
                  <form action={setCategoryActiveAction}>
                    <input type="hidden" name="id" value={category.id} />
                    <input type="hidden" name="active" value={category.activeForVote ? "false" : "true"} />
                    <Button
                      type="submit"
                      variant={category.activeForVote ? "secondary" : "primary"}
                      disabled={!category.activeForVote && (empty || full)}
                      title={full ? "Llegaste al máximo de categorías de premio" : undefined}
                    >
                      {category.activeForVote ? "Quitar de la votación" : "Activar"}
                    </Button>
                  </form>
                ) : (
                  <span className="text-sm text-ink-soft">{category.activeForVote ? "✔ En la votación" : "No participa"}</span>
                )}
              </li>
            );
          })}
        </ul>
      </SectionCard>

      {active.length > 0 && (
        <SectionCard
          id="orden"
          title="Orden de la ceremonia"
          description="Así se revelan en la premiación. Activar o quitar una categoría no cambia el orden: la ceremonia se salta las que no van a la votación. Muévelas con las flechas, arrastrando o eligiendo el puesto, y guarda."
        >
          <RevealOrderEditor
            editable={canEditRevealOrder(event.phase)}
            items={revealSequence(categories).map((id) => {
              const c = byId.get(id)!;
              return { id, title: categoryTitle(c), type: c.type, skipped: !c.activeForVote };
            })}
          />
        </SectionCard>
      )}

      {categories
        .filter((c) => c.finalists.length > 0)
        .map((category) => (
          <SectionCard key={category.id} id={`finalistas-${category.id}`} title={categoryTitle(category)}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {category.finalists.map((f) => (
                <FinalistCard
                  key={f.id}
                  editable={finalistsEditable}
                  finalist={{
                    id: f.id,
                    displayName: f.displayName,
                    external: f.participantId === null && f.optionId === null,
                    option: f.optionId !== null,
                    photoUrl: f.photoUrl,
                    blurb: f.blurb,
                  }}
                />
              ))}
            </ul>
          </SectionCard>
        ))}
    </div>
  );
}
