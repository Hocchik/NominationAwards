"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

const INITIAL = ["Camila", "Diego", "La tía Rosa (externa)", "Mateo"];

/** Demo interactiva: así se verán los nominados elegidos en /nominar. */
export function ChipDemo() {
  const [selected, setSelected] = useState(INITIAL);

  return (
    <div className="space-y-4">
      <div className="flex min-h-10 flex-wrap gap-2" aria-live="polite">
        {selected.map((name) => (
          <Chip key={name} onRemove={() => setSelected((s) => s.filter((n) => n !== name))} removeLabel={`Quitar a ${name}`}>
            {name}
          </Chip>
        ))}
        {selected.length === 0 && (
          <p className="text-sm text-muted">Sin nominados. Toca “Restablecer”.</p>
        )}
      </div>
      <Button variant="ghost" onClick={() => setSelected(INITIAL)}>
        Restablecer
      </Button>
    </div>
  );
}
