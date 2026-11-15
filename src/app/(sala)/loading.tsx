import { Loader } from "@/components/ui/Loader";

// Se muestra al navegar hacia esta pantalla, mientras llega del servidor.
export default function Loading() {
  return <Loader label="Cargando la sala…" />;
}
