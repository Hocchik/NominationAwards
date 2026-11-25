"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { CategoryType } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { moveItem } from "@/lib/event/reveal";
import { resetRevealOrderAction, saveRevealOrderAction } from "../reveal-actions";

export interface RevealOrderItem {
  id: string;
  title: string;
  type: CategoryType;
  /** Ya hay finalistas y esta categoría no está en la votación: la ceremonia se la salta. */
  skipped: boolean;
}

/**
 * Orden de la ceremonia: se acomoda con las flechas, arrastrando la fila (en
 * PC) o eligiendo el puesto, y se guarda todo de una vez.
 */
export function RevealOrderEditor({ items, editable }: { items: RevealOrderItem[]; editable: boolean }) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const saved = items.map((i) => i.id);
  const [order, setOrder] = useState(saved);
  const [dragging, setDragging] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  // Si el servidor trae otro orden (se guardó o cambiaron las categorías), se parte de ese.
  const [base, setBase] = useState(saved.join());
  if (base !== saved.join()) {
    setBase(saved.join());
    setOrder(saved);
  }
  const visible = order.filter((id) => byId.has(id));
  const dirty = visible.join() !== saved.join();
  let number = 0;

  function move(from: number, to: number) {
    setMessage(null);
    setOrder(moveItem(visible, from, to));
  }

  function save() {
    start(async () => {
      const result = await saveRevealOrderAction(visible);
      setMessage({ ok: result.ok, text: result.message ?? (result.ok ? "Orden guardado." : "No se pudo guardar.") });
    });
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-1.5">
        {visible.map((id, index) => {
          const item = byId.get(id)!;
          if (!item.skipped) number++;
          return (
            <li
              key={id}
              draggable={editable}
              onDragStart={() => setDragging(index)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => editable && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging !== null) move(dragging, index);
                setDragging(null);
              }}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-1 border border-line bg-sheet px-3 py-2",
                editable && "cursor-grab active:cursor-grabbing",
                dragging === index && "opacity-50",
                item.skipped && "opacity-60",
              )}
            >
              {editable && (
                <span aria-hidden="true" className="text-ink-soft select-none max-sm:hidden">
                  ⠿
                </span>
              )}
              <span className="w-7 font-display text-sm font-bold text-ink-soft tabular-nums">
                {item.skipped ? "—" : String(number).padStart(2, "0")}
              </span>
              <span className="min-w-40 flex-1 text-sm font-medium">
                {item.title}{" "}
                <Chip size="sm" tone={item.type === "PRIZE" ? "copper" : "sage"}>
                  {item.type === "PRIZE" ? "Premio" : "Honorífica"}
                </Chip>
                {item.skipped && <span className="block text-xs font-normal text-ink-soft">No va a la votación: la ceremonia se la salta</span>}
              </span>
              {editable && (
                <span className="flex items-center gap-1">
                  <label className="sr-only" htmlFor={`puesto-${id}`}>
                    Puesto de «{item.title}»
                  </label>
                  <select
                    id={`puesto-${id}`}
                    value={index}
                    onChange={(e) => move(index, Number(e.target.value))}
                    className="min-h-10 border border-line bg-sheet px-2 text-sm text-ink"
                  >
                    {visible.map((_, i) => (
                      <option key={i} value={i} className="bg-bg">
                        Puesto {i + 1}
                      </option>
                    ))}
                  </select>
                  <Button variant="ghost" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Subir «${item.title}»`}>
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => move(index, index + 1)}
                    disabled={index === visible.length - 1}
                    aria-label={`Bajar «${item.title}»`}
                  >
                    ↓
                  </Button>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={!dirty || pending}>
            {pending ? "Guardando…" : "Guardar orden"}
          </Button>
          {dirty && (
            <Button variant="secondary" onClick={() => setOrder(saved)} disabled={pending}>
              Deshacer cambios
            </Button>
          )}
          <form action={resetRevealOrderAction} className="ml-auto">
            <Button type="submit" variant="ghost" disabled={pending}>
              Volver al orden de fábrica
            </Button>
          </form>
        </div>
      )}
      {dirty && !pending && <p className="text-sm text-ink-soft">Tienes cambios sin guardar.</p>}
      {message && (
        <p role="status" className={cn("text-sm", message.ok ? "text-success" : "text-danger")}>
          {message.text}
        </p>
      )}
    </div>
  );
}
