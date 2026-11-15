"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useRef } from "react";

/** Toques seguidos que abren el panel, y en cuánto tiempo. */
const TAPS = 5;
const WINDOW_MS = 2000;

/**
 * Puerta escondida al panel del organizador: tocar lo que envuelve (el logo)
 * 5 veces seguidas en 2 segundos lleva a /admin, que igual pide la contraseña.
 * No se ve ni se anuncia: la página no tiene ningún link visible al panel.
 */
export function AdminDoor({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const taps = useRef<number[]>([]);

  function tap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < WINDOW_MS), now];
    if (taps.current.length >= TAPS) {
      taps.current = [];
      router.push("/admin");
    }
  }

  return (
    // Escondido a propósito: sin rol de botón ni foco, para que nadie lo descubra.
    <span onClick={tap} className={className} style={{ WebkitTapHighlightColor: "transparent", userSelect: "none" }}>
      {children}
    </span>
  );
}
