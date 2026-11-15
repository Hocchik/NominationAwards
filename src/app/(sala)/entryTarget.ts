/** A dónde se va después de tocar tu nombre: solo rutas de la sala, nunca una URL de afuera. */
export type EntryTarget = "/" | "/nominar" | "/votar";

export function entryTarget(value: unknown): EntryTarget {
  return value === "nominar" || value === "/nominar" ? "/nominar" : value === "votar" || value === "/votar" ? "/votar" : "/";
}
