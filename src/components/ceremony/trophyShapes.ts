// Formas de los trofeos de la ceremonia (CLAUDE.md §9): copa facetada para las
// categorías de premio y laurel con estrella para las honoríficas. Cada trofeo es
// una lista de piezas planas en una caja de 200 × 260; el color de cada pieza es
// un tono del acento de la categoría (luz desde la izquierda) o un gris de la base.

export type TrophyTone = "light" | "accent" | "dark" | "darker" | "baseTop" | "base" | "baseSide" | "shine";

export type TrophyShape =
  | { kind: "poly"; points: string; tone: TrophyTone }
  | { kind: "circle"; cx: number; cy: number; r: number; tone: TrophyTone };

type Point = [number, number];

const rad = (deg: number) => (deg * Math.PI) / 180;
const fmt = (n: number) => Number(n.toFixed(1));
const poly = (points: Point[], tone: TrophyTone): TrophyShape => ({
  kind: "poly",
  points: points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(" "),
  tone,
});
const circle = (cx: number, cy: number, r: number, tone: TrophyTone): TrophyShape => ({ kind: "circle", cx, cy, r, tone });

/** Banda curva (asa de la copa, aro del laurel) entre los radios r1 y r2. */
function band(cx: number, cy: number, r1: number, r2: number, from: number, to: number, tone: TrophyTone, steps = 16): TrophyShape {
  const outer: Point[] = [];
  const inner: Point[] = [];
  for (let k = 0; k <= steps; k++) {
    const a = rad(from + ((to - from) * k) / steps);
    outer.push([cx + r2 * Math.cos(a), cy + r2 * Math.sin(a)]);
    inner.push([cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)]);
  }
  return poly([...outer, ...inner.reverse()], tone);
}

/** Estrella de cinco puntas facetada: cada triángulo alterna luz y sombra. */
function star(cx: number, cy: number, outerR: number, innerR: number): TrophyShape[] {
  const pts: Point[] = Array.from({ length: 10 }, (_, k) => {
    const a = rad(-90 + k * 36);
    const r = k % 2 ? innerR : outerR;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  return pts.map((p, k) => poly([[cx, cy], p, pts[(k + 1) % 10]!], k % 2 ? "dark" : "light"));
}

/** Destello de cuatro puntas. */
function sparkle(cx: number, cy: number, s: number, tone: TrophyTone): TrophyShape {
  const q = s * 0.25;
  return poly(
    [[cx, cy - s], [cx + q, cy - q], [cx + s, cy], [cx + q, cy + q], [cx, cy + s], [cx - q, cy + q], [cx - s, cy], [cx - q, cy - q]],
    tone,
  );
}

/** Base con chaflán y placa (la placa lleva el año). */
function base(top: number): TrophyShape[] {
  return [
    poly([[70, top], [130, top], [138, top + 12], [62, top + 12]], "baseTop"),
    poly([[54, top + 12], [146, top + 12], [146, top + 40], [138, top + 48], [54, top + 48]], "base"),
    poly([[54, top + 12], [62, top + 12], [62, top + 48], [54, top + 48]], "baseSide"),
    poly([[76, top + 21], [124, top + 21], [124, top + 39], [76, top + 39]], "dark"),
  ];
}

/** Copa facetada (premio). La placa queda entre y = 209 y 227. */
export const CUP: TrophyShape[] = [
  band(64, 78, 16, 23, 92, 270, "accent"),
  band(136, 78, 16, 23, -90, 88, "darker"),
  poly([[46, 36], [154, 36], [148, 48], [52, 48]], "light"),
  poly([[52, 48], [78, 48], [90, 122], [80, 122]], "accent"),
  poly([[78, 48], [100, 48], [100, 122], [90, 122]], "light"),
  poly([[100, 48], [122, 48], [110, 122], [100, 122]], "dark"),
  poly([[122, 48], [148, 48], [120, 122], [110, 122]], "darker"),
  poly([[80, 122], [120, 122], [107, 146], [93, 146]], "dark"),
  poly([[95, 146], [100, 146], [100, 176], [95, 176]], "accent"),
  poly([[100, 146], [105, 146], [105, 176], [100, 176]], "darker"),
  poly([[84, 176], [116, 176], [112, 188], [88, 188]], "light"),
  ...base(188),
  sparkle(160, 30, 9, "light"),
];
export const CUP_PLAQUE = { x: 100, y: 222 } as const;

/** Laurel con estrella (honorífica). */
export const LAUREL: TrophyShape[] = (() => {
  const leaves: TrophyShape[] = [];
  const tones: TrophyTone[] = ["light", "accent", "dark"];
  // Dos ramas en arco; cada hoja sigue la curva y se abre un poco hacia afuera.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 7; k++) {
      const a = rad(118 + k * 19);
      const x = 100 - side * Math.cos(a) * 70;
      const y = 108 + Math.sin(a) * 70;
      const dx = side * Math.sin(a);
      const dy = Math.cos(a);
      const tilt = rad(-side * 30);
      const tx = dx * Math.cos(tilt) - dy * Math.sin(tilt);
      const ty = dx * Math.sin(tilt) + dy * Math.cos(tilt);
      const nx = -ty;
      const ny = tx;
      leaves.push(poly([[x - tx * 15, y - ty * 15], [x + nx * 6, y + ny * 6], [x + tx * 15, y + ty * 15], [x - nx * 6, y - ny * 6]], tones[k % 3]!));
    }
  }
  return [
    ...leaves,
    circle(100, 106, 46, "base"),
    band(100, 106, 40, 46, 0, 360, "dark", 32),
    ...star(100, 104, 30, 12),
    poly([[100, 176], [74, 210], [84, 216], [104, 186]], "accent"),
    poly([[100, 176], [126, 210], [116, 216], [96, 186]], "dark"),
    circle(100, 178, 8, "light"),
  ];
})();
