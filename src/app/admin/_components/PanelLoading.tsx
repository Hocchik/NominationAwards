import { Loader } from "@/components/ui/Loader";

/** Mientras carga una sección del panel. */
export function PanelLoading() {
  return <Loader label="Cargando…" className="min-h-[40svh]" />;
}
