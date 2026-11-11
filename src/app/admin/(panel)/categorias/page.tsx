import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/admin";
import { getCategories, getCurrentEvent } from "@/lib/event/queries";
import { canEditCategoryText, canEditStructure } from "@/lib/event/rules";
import { CategoryForm } from "../../_components/CategoryForm";
import { CategoryItem } from "../../_components/CategoryItem";
import { PanelLoading } from "../../_components/PanelLoading";
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
        <p className="text-sm text-muted">
          Primero{" "}
          <Link href="/admin/evento" className="text-gold underline underline-offset-4">
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
        <p className="text-sm text-muted">
          {categories.length === 1 ? "1 categoría" : `${categories.length} categorías`} · {prize}{" "}
          de premio · {honorary} {honorary === 1 ? "honorífica" : "honoríficas"}. A la votación
          pasan hasta {event.maxPrizeCategories} de premio y todas las honoríficas que elijas (se
          decide con los finalistas).
        </p>
        {!structure && (
          <p className="text-sm text-muted">
            Las nominaciones ya empezaron: solo se pueden corregir nombres y consignas.
          </p>
        )}
      </div>

      {categories.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Aún no hay categorías. Agrega la primera aquí abajo; el orden en que aparecen es el
            orden en que el grupo las verá al nominar.
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
              }}
              position={index + 1}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
              canEditStructure={structure}
              canEditText={text}
            />
          ))}
        </ol>
      )}

      {structure && (
        <SectionCard id="nueva-categoria" title="Nueva categoría">
          <CategoryForm />
        </SectionCard>
      )}
    </div>
  );
}
