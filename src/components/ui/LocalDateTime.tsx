"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Fecha y hora en la zona horaria de quien mira. Se dibuja recién en el
 * navegador: el servidor no sabe dónde está cada persona.
 */
export function LocalDateTime({ iso, fallback = "" }: { iso: string; fallback?: string }) {
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  if (!isClient) return <>{fallback}</>;
  const text = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
  return <time dateTime={iso}>{text}</time>;
}
