import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/admin";
import { getCategories, getCurrentEvent } from "@/lib/event/queries";
import { categoryTitle } from "@/lib/event/categoryKinds";
import { isBefore } from "@/lib/event/phases";
import { revealSequence } from "@/lib/event/reveal";
import { canAddCategoryOptions, canEditCategoryText, canEditFinalistsCount, canEditRevealOrder, canEditStructure } from "@/lib/event/rules";
import { loadPresetCategoriesAction } from "../../actions";
import { CategoryForm } from "../../_components/CategoryForm";
import { CategoryItem } from "../../_components/CategoryItem";
import { PanelLoading } from "../../_components/PanelLoading";
import { RevealOrderEditor } from "../../_components/RevealOrderEditor";
import { SectionCard } from "../../_components/SectionCard";

export const metadata: Metadata = { title: "Categorías" };

export default function CategoriesPage() {
  return (
    <Suspense fallback={<PanelLoading />}>
      <CategoriesPanel />
    </Suspense>
  );
}

async function CategoriesPanel() {
  await requireAdmin();
  const event = await getCurrentEvent();

  if (!event) {
    return (
      <Card className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Categorías</h1>
        <p className="text-sm text-ink-soft">
          Primero{" "}
          <Link href="/admin/evento" className="font-semibold text-ink underline decoration-copper decoration-2 underline-offset-4">
            crea el evento
          </Link>
          .
        </p>
      </Card>
    );
  }

  const categories = await getCategories(event.id);
  const structure = canEditStructure(event.phase);
  const text = canEditCategoryText(event.phase);
  const prize = categories.filter((c) => c.type === "PRIZE").length;
  const honorary = categories.length - prize;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Categorías</h1>
        <p className="text-sm text-ink-soft">
          {categories.length === 1 ? "1 categoría" : `${categories.length} categorías`} · {prize}{" "}
          de premio · {honorary} {honorary === 1 ? "honorífica" : "honoríficas"}. A la votación
          pasan hasta {event.maxPrizeCategories} de premio y todas las honoríficas que elijas (se
          decide con los finalistas).
        </p>
        {!structure && (
          <p className="text-sm text-ink-soft">
            Las nominaciones ya empezaron: solo se pueden corregir nombres y consignas.
          </p>
        )}
      </div>

      {categories.length === 0 && structure && (
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Las 25 categorías de Premios del Grupo</h2>
          <p className="text-sm text-ink-soft">
            13 de premio y 12 honoríficas (normales, «Más propenso/a a…», la pregunta y las de opciones),
            con el orden de Nominados y el de la ceremonia ya puestos y EOTY al final. Las consignas son
            un borrador: después las corriges aquí. Las opciones de Evento del año, La mejor frase y
            Mejor profe se agregan en cada una.
          </p>
          <form action={loadPresetCategoriesAction}>
            <Button type="submit">Cargar las 25 categorías</Button>
          </form>
        </Card>
      )}

      {categories.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-soft">
            Aún no hay categorías. Agrega la primera aquí abajo. El grupo las ve primero las de
            premio y luego las honoríficas, cada grupo en este orden.
          </p>
        </Card>
      ) : (
        <ol className="space-y-3">
          {categories.map((category, index) => (
            <CategoryItem
              key={category.id}
              category={{
                id: category.id,
                name: category.name,
                description: category.description,
                type: category.type,
                framing: category.framing,
                nomineeKind: category.nomineeKind,
                maxPicks: category.maxPicks,
                minPicks: category.minPicks,
                finalistCount: category.finalistCount,
                allowExternal: category.allowExternal,
              }}
              options={category.options.map((o) => ({ id: o.id, label: o.label, blurb: o.blurb, photoUrl: o.photoUrl }))}
              canAddOptions={canAddCategoryOptions(event.phase)}
              canEditFinalists={canEditFinalistsCount(event.phase)}
              position={index + 1}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
              canEditStructure={structure}
              canEditText={text}
            />
          ))}
        </ol>
      )}

      {categories.length > 0 && (
        <SectionCard
          id="orden-ceremonia"
          title="Orden de la ceremonia"
          description="Así se revelan en la premiación. Muévelas con las flechas, arrastrando la fila o eligiendo el puesto, y guarda. Puedes cambiarlo hasta que empiece la ceremonia; las que no vayan a la votación se saltan solas."
        >
          <RevealOrderEditor
            editable={canEditRevealOrder(event.phase)}
            items={(() => {
              const byId = new Map(categories.map((c) => [c.id, c]));
              const finalistsReady = !isBefore(event.phase, "FINALISTS_READY");
              return revealSequence(categories).map((id) => {
                const c = byId.get(id)!;
                return { id, title: categoryTitle(c), type: c.type, skipped: finalistsReady && !c.activeForVote };
              });
            })()}
          />
        </SectionCard>
      )}

      {structure && (
        <SectionCard id="nueva-categoria" title="Nueva categoría">
          <CategoryForm />
        </SectionCard>
      )}
    </div>
  );
}
