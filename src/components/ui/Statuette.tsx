"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

// La estatuilla de Premios del Grupo (lienzo, ronda 19 · B01 «brazos en X»):
// figura sin rostro, brazos cruzados en X con los puños sobre los brazos y
// pedestal redondo. Es el logo y el ícono de toda la app (CLAUDE.md §9).
// Una sola tinta (currentColor); las líneas entre los brazos son calados de
// verdad (máscara), así se ve bien sobre cualquier fondo.

const SILHOUETTE = [
  "M100 16 C113 16 119 27 119 41 C119 54 114 63 107 67 L93 67 C86 63 81 54 81 41 C81 27 87 16 100 16 Z",
  "M91 60 L109 60 L112 82 L88 82 Z",
  "M62 86 C72 78 88 76 100 76 C112 76 128 78 138 86 C145 93 145 106 141 118 L132 156 C128 174 124 192 122 210 L78 210 C76 192 72 174 68 156 L59 118 C55 106 55 93 62 86 Z",
  "M60 90 C50 96 47 112 49 130 L52 160 L67 162 L69 134 C70 116 69 100 65 90 Z",
  "M 140.0 90.0 C 150.0 96.0 153.0 112.0 151.0 130.0 L 148.0 160.0 L 133.0 162.0 L 131.0 134.0 C 130.0 116.0 131.0 100.0 135.0 90.0 Z",
  "M78 208 L122 208 C125 236 123 266 119 296 C116.5 322 114.5 346 113.5 370 L114 386 L101 387 L100.6 300 L99.4 300 L99 387 L86 386 L86.5 370 C85.5 346 83.5 322 81 296 C77 266 75 236 78 208 Z",
  "M86 383 L99.2 383 L99.2 394 L80 394 C80 389 82 385 86 383 Z",
  "M 114.0 383.0 L 100.8 383.0 L 100.8 394.0 L 120.0 394.0 C 120.0 389.0 118.0 385.0 114.0 383.0 Z",
  "M66 394 C66 389 134 389 134 394 L134 404 C134 409 66 409 66 404 Z",
  "M58 408 C58 402 142 402 142 408 L146 466 C146 474 54 474 54 466 Z",
];
const BACK = [
  "M50 156 C72 148 98 137 122 125 L129 139 C106 151 79 163 57 171 Z",
  "M125.5 121.0 C129.5 119.5 130.5 119.5 134.5 121.0 C140.5 122.0 140.5 135.0 135.5 137.0 C130.5 138.5 129.5 138.5 124.5 137.0 C119.5 135.0 119.5 122.0 125.5 121.0 Z",
];
const BACK_THUMB = "M137.5 131 C132 130 127 126 123.5 124.0";
const FRONT = [
  "M150 156 C128 148 102 137 78 125 L71 139 C94 151 121 163 143 171 Z",
  "M65.5 121.0 C69.5 119.5 70.5 119.5 74.5 121.0 C80.5 122.0 80.5 135.0 75.5 137.0 C70.5 138.5 69.5 138.5 64.5 137.0 C59.5 135.0 59.5 122.0 65.5 121.0 Z",
];
const FRONT_THUMB = "M62.5 131 C68 130 73 126 76.5 124.0";
const RING_EDGE = "M66 404 C66 409 134 409 134 404";

/** Proporción de la estatuilla (ancho / alto), para reservar su espacio. */
export const STATUETTE_RATIO = 112 / 468;

export function StatuetteMark({ className, label }: { className?: string; label?: string }) {
  const id = useId().replace(/:/g, "");
  const gap = { fill: "none", stroke: "#000", strokeWidth: 3.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg
      viewBox="44 10 112 468"
      className={cn("w-auto shrink-0", className)}
      style={{ aspectRatio: "112 / 468" }}
      fill="currentColor"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <mask id={`estatuilla-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="500">
        {[...SILHOUETTE, ...BACK, ...FRONT].map((p, i) => (
          <path key={i} d={p} fill="#fff" />
        ))}
        {/* El brazo de atrás: su filo y el pulgar */}
        {BACK.map((p, i) => (
          <path key={i} d={p} {...gap} />
        ))}
        <path d={BACK_THUMB} {...gap} />
        {/* El brazo de adelante tapa al de atrás; luego su filo y el pulgar */}
        {FRONT.map((p, i) => (
          <path key={i} d={p} fill="#fff" />
        ))}
        {FRONT.map((p, i) => (
          <path key={i} d={p} {...gap} />
        ))}
        <path d={FRONT_THUMB} {...gap} />
        <path d={RING_EDGE} {...gap} />
      </mask>
      <rect x="0" y="0" width="200" height="500" mask={`url(#estatuilla-${id})`} />
    </svg>
  );
}
