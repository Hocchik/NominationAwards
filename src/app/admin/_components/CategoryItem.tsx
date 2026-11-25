"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { categoryTitle } from "@/lib/event/categoryKinds";
import { deleteCategoryAction, moveCategoryAction } from "../actions";
import { CategoryForm, type CategoryFormValues } from "./CategoryForm";
import { CategoryOptions, type CategoryOptionValues } from "./CategoryOptions";

interface CategoryItemProps {
  category: CategoryFormValues;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  /** Reordenar, eliminar y cambiar tipo (solo en preparación). */
  canEditStructure: boolean;
  /** Corregir nombre y consigna. */
  canEditText: boolean;
  /** Cuántos finalistas pasan (hasta el cierre de nominaciones). */
  canEditFinalists: boolean;
  options: CategoryOptionValues[];
  /** Agregar opciones o cambiar su foto (hasta que cierran las nominaciones). */
  canAddOptions: boolean;
}

const KIND_SHORT = {
  PERSON: "Persona",
  PAIR: "Pareja",
  OPTION: "Opciones",
  TEXT: "Texto libre",
  DIRECT: "Finalistas directos (no se nomina)",
} as const;

export function CategoryItem({
  category,
  position,
  isFirst,
  isLast,
  canEditStructure,
  canEditText,
  canEditFinalists,
  options,
  canAddOptions,
}: CategoryItemProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isPrize = category.type === "PRIZE";

  if (editing) {
    return (
      <Card as="li" accent={isPrize ? "prize" : "honor"}>
        <CategoryForm
          category={category}
          canEditType={canEditStructure}
          canEditFinalists={canEditFinalists}
          onDone={() => setEditing(false)}
        />
      </Card>
    );
  }

  return (
    <Card as="li" accent={isPrize ? "prize" : "honor"} className="flex gap-4">
      <span className="font-display text-2xl text-ink-soft tabular-nums" aria-hidden="true">
        {String(position).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">
            <span className="sr-only">{position}. </span>
            {categoryTitle(category)}
          </h3>
          <Chip size="sm" tone={isPrize ? "copper" : "sage"}>
            {isPrize ? "Premio" : "Honorífica"}
          </Chip>
        </div>
        <p className="text-sm text-ink-soft">{category.description}</p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
          <span>{KIND_SHORT[category.nomineeKind]}</span>
          {category.nomineeKind !== "DIRECT" && (
            <span>· {category.maxPicks === 1 ? "cada uno pone 1" : `cada uno pone hasta ${category.maxPicks}`}</span>
          )}
          {category.minPicks > 0 && <span>· obligatoria</span>}
          <span>· {category.finalistCount} finalistas</span>
          {category.framing === "QUESTION" && <span>· pregunta</span>}
          {category.allowExternal && <span>· permite «de fuera»</span>}
        </p>
        {category.nomineeKind === "TEXT" && (
          <p className="text-xs text-ink-soft">Al cierre de nominaciones verás todo lo que escribieron (sin saber quién ni cuántas veces), juntas los que son lo mismo y pasan los más escritos.</p>
        )}
        {(category.nomineeKind === "OPTION" || category.nomineeKind === "DIRECT") && (
          <CategoryOptions
            categoryId={category.id}
            options={options}
            canAdd={canAddOptions}
            canDelete={canEditStructure}
            direct={category.nomineeKind === "DIRECT"}
          />
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {canEditStructure && (
            <>
              <form action={moveCategoryAction}>
                <input type="hidden" name="id" value={category.id} />
                <input type="hidden" name="direction" value="up" />
                <Button
                  type="submit"
                  variant="ghost"
                  disabled={isFirst}
                  aria-label={`Subir «${categoryTitle(category)}»`}
                >
                  ↑
                </Button>
              </form>
              <form action={moveCategoryAction}>
                <input type="hidden" name="id" value={category.id} />
                <input type="hidden" name="direction" value="down" />
                <Button
                  type="submit"
                  variant="ghost"
                  disabled={isLast}
                  aria-label={`Bajar «${categoryTitle(category)}»`}
                >
                  ↓
                </Button>
              </form>
            </>
          )}
          {canEditText && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Editar
            </Button>
          )}
          {canEditStructure &&
            (confirmingDelete ? (
              <form action={deleteCategoryAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={category.id} />
                <span className="text-sm">¿Eliminar «{categoryTitle(category)}»?</span>
                <Button type="submit" variant="danger">
                  Sí, eliminar
                </Button>
                <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
                  Cancelar
                </Button>
              </form>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
                Eliminar
              </Button>
            ))}
        </div>
      </div>
    </Card>
  );
}
