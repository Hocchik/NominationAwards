"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { deleteCategoryAction, moveCategoryAction } from "../actions";
import { CategoryForm, type CategoryFormValues } from "./CategoryForm";

interface CategoryItemProps {
  category: CategoryFormValues;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  /** Reordenar, eliminar y cambiar tipo (solo en preparación). */
  canEditStructure: boolean;
  /** Corregir nombre y consigna. */
  canEditText: boolean;
}

export function CategoryItem({
  category,
  position,
  isFirst,
  isLast,
  canEditStructure,
  canEditText,
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
            {category.name}
          </h3>
          <Chip size="sm" tone={isPrize ? "copper" : "sage"}>
            {isPrize ? "Premio" : "Honorífica"}
          </Chip>
        </div>
        <p className="text-sm text-ink-soft">{category.description}</p>

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
                  aria-label={`Subir «${category.name}»`}
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
                  aria-label={`Bajar «${category.name}»`}
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
                <span className="text-sm">¿Eliminar «{category.name}»?</span>
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
