import { Card } from "@/components/ui/Card";

export function PanelLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only">Cargando…</p>
      {[0, 1, 2].map((i) => (
        <Card key={i} className="h-32 animate-pulse" aria-hidden="true">
          <span />
        </Card>
      ))}
    </div>
  );
}
