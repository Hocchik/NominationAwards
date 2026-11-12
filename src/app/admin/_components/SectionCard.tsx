import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

/** Bloque del panel con título: cada <section> queda nombrada por su <h2>. */
export function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card as="section" aria-labelledby={id} className="space-y-5">
      <div className="space-y-1">
        <h2 id={id} className="font-display text-xl font-semibold sm:text-2xl">
          {title}
        </h2>
        {description && <p className="text-sm text-ink-soft">{description}</p>}
      </div>
      {children}
    </Card>
  );
}
