# Demo para probar y página de diseño — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un demo en `/demo` para recorrer Nominar → Nominados → Votar → Ceremonia con un grupo ficticio, sin tocar la base, y un archivo `public/diseno.html` que presenta el diseño «Día y noche».

**Architecture:** El demo reusa los componentes reales (`NominationBallot`, `NomineesBoard`, `VoteBallotForm`, `CeremonyShow`) con props opcionales nuevas cuyo valor por defecto es el comportamiento actual. Un `DemoProvider` de cliente guarda en memoria un par de llaves de juguete y lo enviado; la ceremonia del demo sella ~20 votos simulados y los abre con la misma función que la ceremonia real (`openAndTallyVotes`). La página de diseño es HTML + CSS autónomo, sin JavaScript.

**Tech Stack:** Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind 4, libsodium-wrappers, zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-12-demo-y-pagina-de-diseno-design.md`

**Commits:** el usuario hace commit solo cuando lo pide, con su usuario (Hocchik) y **sin** línea `Co-Authored-By`. Los pasos «Punto de commit» marcan cortes sugeridos: no ejecutarlos sin su visto bueno. Cada push a `main` despliega a producción en Vercel.

**Reglas que no se tocan (CLAUDE.md §4):** el demo no llama a server actions ni a la base, no escribe cookies, no guarda llaves en `localStorage`/`sessionStorage` y no hace `console.log` de papeletas ni conteos. Las páginas reales deben seguir pasando exactamente lo mismo que hoy.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/lib/demo/fixtures.ts` | Crear | Grupo, categorías, finalistas, reglas y tabla de votos simulados del demo (datos puros + helpers `byName`, `leaders`, `demoRevealOrder`) |
| `src/lib/demo/fixtures.test.ts` | Crear | Integridad de los datos del demo |
| `src/lib/ballots/openVotes.ts` | Crear | `openAndTallyVotes`: abre, valida y cuenta una urna de votos (compartida por la ceremonia real y la del demo) |
| `src/lib/ballots/openVotes.test.ts` | Crear | Tests de apertura y conteo |
| `src/lib/demo/simulate.ts` | Crear | Papeletas simuladas, barajado y sellado de la urna del demo |
| `src/lib/demo/simulate.test.ts` | Crear | Urna del demo de punta a punta (sellar → abrir → ganadores) |
| `src/app/ceremonia/CeremonyShow.tsx` | Modificar | Usa `openAndTallyVotes`; props opcionales `openBallots` e `intro` |
| `src/app/s/[roomCode]/nominar/NominationBallot.tsx` | Modificar | Props opcionales `onSubmit` y `doneLink` |
| `src/app/s/[roomCode]/votar/VoteBallotForm.tsx` | Modificar | Props opcionales `onSubmit` y `doneLink` |
| `src/app/demo/DemoProvider.tsx` | Crear | Estado del demo en memoria (llaves de juguete, comprobantes, voto sellado) |
| `src/app/demo/DemoBanner.tsx` | Crear | Franja «Demo · nada de esto se guarda» con los pasos |
| `src/app/demo/DemoParts.tsx` | Crear | `DemoLoading` y `DemoSent` (tarjeta «Ya enviaste…») |
| `src/app/demo/layout.tsx` | Crear | Monta el provider y la franja |
| `src/app/demo/page.tsx` | Crear | Portada del demo |
| `src/app/demo/nominar/page.tsx`, `DemoNominate.tsx` | Crear | Paso Nominar |
| `src/app/demo/nominados/page.tsx`, `DemoNominees.tsx` | Crear | Paso Nominados |
| `src/app/demo/votar/page.tsx`, `DemoVote.tsx` | Crear | Paso Votar |
| `src/app/demo/ceremonia/page.tsx`, `DemoCeremony.tsx` | Crear | Paso Ceremonia |
| `src/app/page.tsx` | Modificar | Botón «Pruébalo: demo» |
| `public/diseno.html` | Crear | Página autónoma del diseño |
| `CLAUDE.md` | Modificar | §7: rutas `/demo` y `/diseno.html` |

Comandos útiles (desde la raíz del repo):

- Un test: `npx vitest run src/lib/demo/fixtures.test.ts`
- Todos los tests: `npm test`
- Tipos: `npx tsc --noEmit`
- Lint: `npm run lint`

---

### Task 1: Datos del demo

**Files:**
- Create: `src/lib/demo/fixtures.ts`
- Test: `src/lib/demo/fixtures.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`src/lib/demo/fixtures.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEMO_CANDIDATES,
  DEMO_CATEGORIES,
  DEMO_SELF_NAME,
  DEMO_SIMULATED_VOTES,
  DEMO_VOTERS,
  byName,
  demoRevealOrder,
  leaders,
} from "./fixtures";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const finalists = DEMO_CATEGORIES.flatMap((c) => c.finalists);

describe("datos del demo", () => {
  it("todos los ids son UUID v4 y no se repiten", () => {
    const ids = [...DEMO_CANDIDATES.map((p) => p.id), ...DEMO_CATEGORIES.map((c) => c.id), ...finalists.map((f) => f.id)];
    for (const id of ids) expect(id).toMatch(UUID_V4);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("los finalistas del grupo existen en el grupo y con el mismo nombre", () => {
    const group = new Map(DEMO_CANDIDATES.map((p) => [p.id, p.name]));
    for (const f of finalists.filter((f) => f.participantId !== null)) {
      expect(group.get(f.participantId!)).toBe(f.name);
    }
  });

  it("hay premios, honoríficas y al menos un referente de fuera del grupo", () => {
    expect(DEMO_CATEGORIES.some((c) => c.type === "PRIZE")).toBe(true);
    expect(DEMO_CATEGORIES.some((c) => c.type === "HONORARY")).toBe(true);
    expect(finalists.some((f) => f.participantId === null)).toBe(true);
  });

  it("cada categoría tiene de 3 a 4 finalistas", () => {
    for (const c of DEMO_CATEGORIES) {
      expect(c.finalists.length).toBeGreaterThanOrEqual(3);
      expect(c.finalists.length).toBeLessThanOrEqual(4);
    }
  });

  it("el visitante no está en el grupo (no puede nominarse)", () => {
    expect(DEMO_CANDIDATES.map((p) => p.name)).not.toContain(DEMO_SELF_NAME);
  });

  it("los votos simulados son de finalistas de su categoría y no pasan de los votantes", () => {
    for (const c of DEMO_CATEGORIES) {
      const counts = DEMO_SIMULATED_VOTES[c.id];
      expect(counts).toBeDefined();
      const ids = new Set(c.finalists.map((f) => f.id));
      for (const id of Object.keys(counts!)) expect(ids.has(id)).toBe(true);
      expect(Object.values(counts!).reduce((sum, n) => sum + n, 0)).toBeLessThanOrEqual(DEMO_VOTERS);
    }
  });

  it("exactamente una categoría queda empatada arriba", () => {
    const tied = DEMO_CATEGORIES.filter((c) => leaders(DEMO_SIMULATED_VOTES[c.id] ?? {}).length > 1);
    expect(tied).toHaveLength(1);
    expect(leaders(DEMO_SIMULATED_VOTES[tied[0]!.id]!)).toHaveLength(2);
  });

  it("la revelación pone las honoríficas primero y no pierde categorías", () => {
    const order = demoRevealOrder();
    expect(order).toHaveLength(DEMO_CATEGORIES.length);
    const firstPrize = order.findIndex((c) => c.type === "PRIZE");
    expect(order.slice(0, firstPrize).every((c) => c.type === "HONORARY")).toBe(true);
    expect(order.slice(firstPrize).every((c) => c.type === "PRIZE")).toBe(true);
  });

  it("byName ordena alfabéticamente en español sin tocar la lista original", () => {
    const list = [{ name: "Úrsula" }, { name: "Ana" }, { name: "Óscar" }];
    expect(byName(list).map((x) => x.name)).toEqual(["Ana", "Óscar", "Úrsula"]);
    expect(list[0]!.name).toBe("Úrsula");
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/lib/demo/fixtures.test.ts`
Expected: FAIL con `Failed to resolve import "./fixtures"`.

- [ ] **Step 3: Escribir los datos**

`src/lib/demo/fixtures.ts`:

```ts
import type { CategoryType } from "@/generated/prisma/enums";
import type { Candidate, NominationRules } from "@/lib/ballots/nomination";

// Datos del demo (/demo): un grupo y unas categorías inventadas. Los IDs son
// UUID v4 fijos para que las mismas funciones y esquemas del evento real los
// acepten. Nada de esto se guarda en la base ni sale del navegador.

export interface DemoFinalist {
  id: string;
  name: string;
  blurb: string;
  /** Participante del grupo ficticio; null = referente de fuera del grupo. */
  participantId: string | null;
}

export interface DemoCategory {
  id: string;
  name: string;
  description: string;
  type: CategoryType;
  finalists: DemoFinalist[];
}

/** categoryId → (finalistId → cuántos votos simulados recibe). */
export type VoteTable = Record<string, Record<string, number>>;

export const DEMO_EVENT_NAME = "Premios de prueba";
/** Solo nombra los borradores que las papeletas guardan en sessionStorage. */
export const DEMO_ROOM_CODE = "DEMO";
export const DEMO_SELF_NAME = "Invitado";
export const DEMO_RULES: NominationRules = { min: 3, max: 5, allowSkip: true };
export const DEMO_ALLOW_ABSTENTION = true;
/** Amigos ficticios que votan en la urna del demo. */
export const DEMO_VOTERS = 20;

const P = {
  ana: "3a6bcb65-679f-4914-a5b9-50f13d1a4963",
  bruno: "46c68ebd-b102-427f-b099-5612b2d79eff",
  camila: "6e70345c-db1b-4582-84b0-a5275944c8c6",
  diego: "fa712f64-df03-4c0c-b7ca-8e3c6d3f4d7b",
  elena: "6197df53-cfcf-4c47-9ffa-6ec71887f19f",
  fabian: "725678a5-ae30-4239-82d7-96506ceaaf83",
  gabriela: "f364b3c4-9710-4aaa-96e1-8e41a0461fed",
  hugo: "13f46446-b9f3-4442-933d-b02e3fb8e162",
  ines: "a74c6cd5-b6e6-4f78-8449-00e21ea083d7",
  julian: "b97f85e5-4893-4a18-aac3-995e37339823",
  lucia: "44053e37-02a5-4f84-98b3-4884367a1913",
  mateo: "403dddd3-4639-4cf8-87a1-1491ad366d62",
} as const;

export const DEMO_CANDIDATES: Candidate[] = [
  { id: P.ana, name: "Ana Torres" },
  { id: P.bruno, name: "Bruno Díaz" },
  { id: P.camila, name: "Camila Rojas" },
  { id: P.diego, name: "Diego Paredes" },
  { id: P.elena, name: "Elena Vargas" },
  { id: P.fabian, name: "Fabián Soto" },
  { id: P.gabriela, name: "Gabriela Ríos" },
  { id: P.hugo, name: "Hugo Medina" },
  { id: P.ines, name: "Inés Castro" },
  { id: P.julian, name: "Julián Herrera" },
  { id: P.lucia, name: "Lucía Fernández" },
  { id: P.mateo, name: "Mateo Salazar" },
];

const C = {
  party: "f8572abf-0d8e-4d25-b9e4-64ed1d57eb39",
  late: "5074c316-03cc-4f74-810f-a95e53496394",
  chef: "3fbff61f-32ac-4ad0-873f-b1627cc5f2f2",
  story: "27b991d7-2122-41e4-9e81-76b0ff5bc937",
  friend: "fe57b5f6-cd0e-48fe-8850-66c8fcfab12d",
  idol: "30230433-ff30-45b4-9115-60f5684d421e",
} as const;

const F = {
  partyBruno: "3e0aabb0-e1ff-4e91-921f-a19ce6313688",
  partyGabriela: "9ea772b9-aa10-46b7-99d5-558513149873",
  partyJulian: "6094c598-7f14-4647-9d5e-48a72a1e751e",
  partyLucia: "0f0fc290-1f97-4c8d-9bfc-864338c8340d",
  lateDiego: "b9830707-ec4c-4179-a2d9-5e057cdfcc41",
  lateFabian: "d3f03593-f401-4360-8026-9223b2fcf535",
  lateInes: "7e413f49-dced-4b0a-b32b-8b65886d69a6",
  chefCamila: "463b3914-4855-43fe-b31c-39f784a9a0ff",
  chefHugo: "5a7c19f6-481c-4adf-93ae-2a63ebcbc1be",
  chefElena: "208f8606-29c5-42d0-9c63-72ec34ce3968",
  storyMateo: "aa89ed8a-3524-46f6-876b-32c459f1770c",
  storyAna: "235baa05-848a-49e0-971f-daec9048f87c",
  storyBruno: "edcc6d6a-6d89-4705-9c90-de8965cb2403",
  storyGabriela: "1db9c76c-dd54-4e47-88e4-129a179e24e9",
  friendInes: "78b6d377-3fcc-44fb-9272-128526e71bbe",
  friendHugo: "139bf71c-a914-49c5-b82f-6a1c66c7bda8",
  friendAna: "9fb1dba7-ba82-4737-a7c6-7e92043ab09f",
  idolRosa: "eaaa68fe-3317-4794-88f6-448b13ebd446",
  idolPepe: "74dbd322-798b-4821-87e3-b420dd958038",
  idolRamirez: "d49ea772-78d8-42ae-94a4-49ea7fbdd6ad",
} as const;

export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    id: C.party,
    name: "El alma de la fiesta",
    description: "Quién convierte cualquier reunión en fiesta.",
    type: "PRIZE",
    finalists: [
      { id: F.partyBruno, name: "Bruno Díaz", participantId: P.bruno, blurb: "Llega con parlante y se va con amigos nuevos." },
      { id: F.partyGabriela, name: "Gabriela Ríos", participantId: P.gabriela, blurb: "Arma el karaoke aunque nadie lo pida." },
      { id: F.partyJulian, name: "Julián Herrera", participantId: P.julian, blurb: "Su playlist salvó más de una noche." },
      { id: F.partyLucia, name: "Lucía Fernández", participantId: P.lucia, blurb: "La última en irse, siempre." },
    ],
  },
  {
    id: C.late,
    name: "Siempre llega tarde",
    description: "Quién nos tuvo esperando más veces este año.",
    type: "PRIZE",
    finalists: [
      { id: F.lateDiego, name: "Diego Paredes", participantId: P.diego, blurb: "«Ya estoy llegando», desde su casa." },
      { id: F.lateFabian, name: "Fabián Soto", participantId: P.fabian, blurb: "Llegó cuando ya pedíamos la cuenta." },
      { id: F.lateInes, name: "Inés Castro", participantId: P.ines, blurb: "Fue puntual una vez y nadie lo olvida." },
    ],
  },
  {
    id: C.chef,
    name: "Chef del grupo",
    description: "Quién cocina mejor en las juntas.",
    type: "PRIZE",
    finalists: [
      { id: F.chefCamila, name: "Camila Rojas", participantId: P.camila, blurb: "Su ceviche tiene lista de espera." },
      { id: F.chefHugo, name: "Hugo Medina", participantId: P.hugo, blurb: "El dueño indiscutido de la parrilla." },
      { id: F.chefElena, name: "Elena Vargas", participantId: P.elena, blurb: "Postres que desaparecen en cinco minutos." },
    ],
  },
  {
    id: C.story,
    name: "La anécdota del año",
    description: "Quién protagonizó la historia que más contamos.",
    type: "PRIZE",
    finalists: [
      { id: F.storyMateo, name: "Mateo Salazar", participantId: P.mateo, blurb: "Se perdió camino a la playa con la comida de todos." },
      { id: F.storyAna, name: "Ana Torres", participantId: P.ana, blurb: "Saludó una hora a un desconocido creyendo que era su primo." },
      { id: F.storyBruno, name: "Bruno Díaz", participantId: P.bruno, blurb: "Se quedó dormido en su propia fiesta sorpresa." },
      { id: F.storyGabriela, name: "Gabriela Ríos", participantId: P.gabriela, blurb: "Fue al matrimonio equivocado y se quedó al baile." },
    ],
  },
  {
    id: C.friend,
    name: "Amistad incondicional",
    description: "Quién siempre está cuando lo necesitas.",
    type: "HONORARY",
    finalists: [
      { id: F.friendInes, name: "Inés Castro", participantId: P.ines, blurb: "Contesta a las 3 a. m. si la necesitas." },
      { id: F.friendHugo, name: "Hugo Medina", participantId: P.hugo, blurb: "Ayudó en tres mudanzas este año." },
      { id: F.friendAna, name: "Ana Torres", participantId: P.ana, blurb: "Se acuerda de todos los cumpleaños." },
    ],
  },
  {
    id: C.idol,
    name: "Referente del año",
    description: "Alguien de fuera del grupo que nos marcó este año.",
    type: "HONORARY",
    finalists: [
      { id: F.idolRosa, name: "La tía Rosa", participantId: null, blurb: "Nos adoptó a todos en cada almuerzo." },
      { id: F.idolPepe, name: "Don Pepe, el de la tienda", participantId: null, blurb: "Fía, aconseja y nunca cierra." },
      { id: F.idolRamirez, name: "El profe Ramírez", participantId: null, blurb: "Nos aprobó a todos, contra todo pronóstico." },
    ],
  },
];

/**
 * Cómo votan los 20 amigos ficticios. Decide qué tan reñida se ve la
 * ceremonia: «Siempre llega tarde» queda empatada a propósito, para que el
 * voto del visitante pueda desempatarla.
 */
export const DEMO_SIMULATED_VOTES: VoteTable = {
  [C.party]: { [F.partyBruno]: 9, [F.partyGabriela]: 6, [F.partyJulian]: 3, [F.partyLucia]: 2 },
  [C.late]: { [F.lateDiego]: 7, [F.lateFabian]: 7, [F.lateInes]: 4 },
  [C.chef]: { [F.chefCamila]: 11, [F.chefHugo]: 5, [F.chefElena]: 3 },
  [C.story]: { [F.storyMateo]: 6, [F.storyAna]: 5, [F.storyBruno]: 5, [F.storyGabriela]: 4 },
  [C.friend]: { [F.friendInes]: 10, [F.friendHugo]: 8, [F.friendAna]: 2 },
  [C.idol]: { [F.idolRosa]: 8, [F.idolPepe]: 6, [F.idolRamirez]: 4 },
};

/** Orden de revelación por defecto (CLAUDE.md §3): honoríficas primero, premios al final. */
export function demoRevealOrder(): DemoCategory[] {
  return [...DEMO_CATEGORIES.filter((c) => c.type === "HONORARY"), ...DEMO_CATEGORIES.filter((c) => c.type === "PRIZE")];
}

/** Orden alfabético en español, como muestran los finalistas las páginas reales (regla 8). */
export function byName<T extends { name: string }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Ids con más votos en una tabla de conteos (más de uno = empate). */
export function leaders(counts: Record<string, number>): string[] {
  const values = Object.values(counts);
  if (values.length === 0) return [];
  const top = Math.max(...values);
  return Object.keys(counts).filter((id) => counts[id] === top);
}
```

> **Contribución del usuario (opcional, modo aprendizaje):** la tabla `DEMO_SIMULATED_VOTES` es la que decide cuán reñida se ve la ceremonia. Al ejecutar, ofrecerle al usuario reescribirla (5–10 líneas). Los tests de este task fijan las reglas: votos solo de finalistas de su categoría, ≤ 20 por categoría y exactamente una categoría empatada entre dos.

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npx vitest run src/lib/demo/fixtures.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Punto de commit (solo si el usuario lo pide)**

```bash
git add src/lib/demo/fixtures.ts src/lib/demo/fixtures.test.ts
git commit -m "Datos de ejemplo del demo"
```

---

### Task 2: `openAndTallyVotes` (abrir y contar la urna)

**Files:**
- Create: `src/lib/ballots/openVotes.ts`
- Test: `src/lib/ballots/openVotes.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`src/lib/ballots/openVotes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateKeyPair } from "@/lib/crypto/keys";
import { sealPayload } from "@/lib/crypto/seal";
import { openAndTallyVotes } from "./openVotes";
import { voteBallotBytes } from "./vote";

const categories = [{ id: "cat", finalistIds: ["a", "b"] }];
const bytes = voteBallotBytes(1);
const vote = (receipt: string, choice: string | null) => ({ v: 1, kind: "vote", receipt, votes: { cat: choice } });

describe("openAndTallyVotes", () => {
  it("abre, cuenta y devuelve los comprobantes en orden alfabético", async () => {
    const keys = await generateKeyPair();
    const ciphertexts = await Promise.all(
      [vote("ZZZ-222", "a"), vote("AAA-333", "a"), vote("MMM-444", "b")].map((b) => sealPayload(b, keys.publicKey, bytes)),
    );
    const results = await openAndTallyVotes(ciphertexts, keys, categories);
    expect(results.byCategory.cat?.winnerIds).toEqual(["a"]);
    expect(results.receipts).toEqual(["AAA-333", "MMM-444", "ZZZ-222"]);
    expect(results.unreadable).toBe(0);
  });

  it("cuenta aparte lo que no se puede abrir o no es un voto", async () => {
    const keys = await generateKeyPair();
    const other = await generateKeyPair();
    const ciphertexts = [
      await sealPayload(vote("AAA-333", "b"), keys.publicKey, bytes),
      await sealPayload(vote("BBB-444", "a"), other.publicKey, bytes), // sellado con otra llave
      await sealPayload({ v: 1, kind: "nomination", receipt: "CCC-555", categories: {} }, keys.publicKey, bytes), // no es un voto
    ];
    const results = await openAndTallyVotes(ciphertexts, keys, categories);
    expect(results.unreadable).toBe(2);
    expect(results.receipts).toEqual(["AAA-333"]);
    expect(results.byCategory.cat?.winnerIds).toEqual(["b"]);
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/lib/ballots/openVotes.test.ts`
Expected: FAIL con `Failed to resolve import "./openVotes"`.

- [ ] **Step 3: Implementar**

`src/lib/ballots/openVotes.ts`:

```ts
import type { KeyPair } from "@/lib/crypto/keys";
import { openPayload } from "@/lib/crypto/open";
import { type VoteBallot, type VoteCategory, voteBallotSchema } from "./vote";
import { type CategoryResult, tallyVotes } from "./voteTally";

// Abre y cuenta la urna de la votación. Corre SOLO en el navegador de la
// ceremonia (la real y la del demo): la llave vive en memoria (regla 7) y de
// aquí salen solo ganadores y comprobantes, nunca conteos (regla 8).

export interface VoteResults {
  byCategory: Record<string, CategoryResult>;
  /** Comprobantes de las papeletas abiertas, en orden alfabético. */
  receipts: string[];
  /** Papeletas que no se pudieron abrir o no tienen forma de voto. */
  unreadable: number;
}

export async function openAndTallyVotes(
  ciphertexts: string[],
  keys: KeyPair,
  categories: VoteCategory[],
): Promise<VoteResults> {
  const ballots: VoteBallot[] = [];
  let unreadable = 0;
  for (const ciphertext of ciphertexts) {
    try {
      const result = voteBallotSchema.safeParse(await openPayload(ciphertext, keys));
      if (result.success) ballots.push(result.data);
      else unreadable++;
    } catch {
      unreadable++;
    }
  }
  const tallies = tallyVotes(ballots, categories);
  return {
    byCategory: Object.fromEntries(tallies.map((t) => [t.categoryId, t])),
    receipts: ballots.map((b) => b.receipt).sort(),
    unreadable,
  };
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npx vitest run src/lib/ballots/openVotes.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Punto de commit (solo si el usuario lo pide)**

```bash
git add src/lib/ballots/openVotes.ts src/lib/ballots/openVotes.test.ts
git commit -m "Función compartida para abrir y contar la urna de votos"
```

---

### Task 3: La ceremonia usa `openAndTallyVotes` y acepta otra fuente de votos

**Files:**
- Modify: `src/app/ceremonia/CeremonyShow.tsx` (imports 1-15, tipo `Results` 43-47, props 50-60, `loadKey` 81-115, pantalla de inicio 159-200, `SlideView` ~318)

- [ ] **Step 1: Cambiar los imports**

Reemplazar las líneas 3-15 por:

```tsx
import { type ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LogoMark } from "@/components/ui/Logo";
import type { CategoryType } from "@/generated/prisma/enums";
import { type VoteResults, openAndTallyVotes } from "@/lib/ballots/openVotes";
import { celebrate, playDrumroll, playFanfare } from "@/lib/ceremony/effects";
import { cn } from "@/lib/cn";
import { parseKeyFile } from "@/lib/crypto/keyFile";
import type { KeyPair } from "@/lib/crypto/keys";
import { initials } from "@/lib/initials";
import { getVoteBallotsAction } from "./actions";
```

- [ ] **Step 2: Quitar el tipo `Results` local**

Borrar la interfaz `Results` (líneas 43-47) y reemplazar cada uso de `Results` en el archivo por `VoteResults` (en `useState<Results | null>` y en las props de `SlideView`). Comprobar con: `npx tsc --noEmit` → sin menciones a `Results`.

- [ ] **Step 3: Props nuevas**

Reemplazar la firma de `CeremonyShow` por:

```tsx
/** Urna lista para abrir: la llave en memoria y los votos sellados. */
export type BallotSource = () => Promise<{ keys: KeyPair; ciphertexts: string[] }>;

export function CeremonyShow({
  eventName,
  publicKey,
  showWinnerPercent,
  categories,
  openBallots,
  intro,
}: {
  eventName: string;
  publicKey: string;
  showWinnerPercent: boolean;
  categories: CategoryInfo[];
  /** Si llega (demo), se abre la urna con un botón en vez del archivo del notario. */
  openBallots?: BallotSource;
  /** Texto de la pantalla de inicio; por defecto, el del notario. */
  intro?: ReactNode;
}) {
  const [results, setResults] = useState<VoteResults | null>(null);
```

(El resto de los `useState` sigue igual.)

- [ ] **Step 4: Reemplazar `loadKey` por `openWith` + `loadKey`**

Reemplazar la función `loadKey` completa (líneas 81-115) por:

```tsx
  // Abre la urna y se queda solo con los ganadores; la llave y los votos
  // abiertos se descartan al terminar (regla 7).
  function openWith(load: BallotSource, fallback: string) {
    setError(null);
    startTransition(async () => {
      try {
        const { keys, ciphertexts } = await load();
        setResults(
          await openAndTallyVotes(
            ciphertexts,
            keys,
            categories.map((c) => ({ id: c.id, finalistIds: c.finalists.map((f) => f.id) })),
          ),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : fallback);
      }
    });
  }

  function loadKey(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    openWith(async () => {
      const parsed = await parseKeyFile(await file.text());
      if (parsed.vote.publicKey !== publicKey) throw new Error("Este archivo de llaves no corresponde a este evento.");
      const response = await getVoteBallotsAction();
      if (!response.ok) throw new Error(response.message);
      return { keys: parsed.vote, ciphertexts: response.ciphertexts };
    }, "No se pudo leer el archivo.");
  }
```

- [ ] **Step 5: Pantalla de inicio**

En el bloque `if (!started) { … }`, reemplazar el `<p className="text-sm text-ink-soft">El notario carga…</p>` por:

```tsx
            <div className="text-sm text-ink-soft">
              {intro ??
                "El notario carga su archivo de llaves. Los votos se abren en este navegador y solo se guardan en memoria los ganadores."}
            </div>
```

y el `<label …>…<input type="file" …/></label>` (la rama `!results ?`) por:

```tsx
          {!results ? (
            openBallots ? (
              <Button size="lg" onClick={() => openWith(openBallots, "No se pudo abrir la urna.")} disabled={pending}>
                {pending ? "Abriendo la urna…" : "Abrir la urna"}
              </Button>
            ) : (
              <label className="inline-flex min-h-12 cursor-pointer items-center border-[1.5px] border-ink px-5 text-[15px] font-bold transition-colors hover:bg-ink/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-ink">
                {pending ? "Abriendo votos…" : "Elegir archivo de llaves…"}
                <input type="file" accept="application/json,.json" onChange={loadKey} disabled={pending} className="sr-only" />
              </label>
            )
          ) : (
```

(La rama de resultados, con «✓ Votos abiertos» y «Comenzar la ceremonia», queda igual.)

- [ ] **Step 6: Verificar tipos, lint y tests**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: sin errores; todos los tests pasan. `src/app/ceremonia/page.tsx` no cambia (no pasa `openBallots` ni `intro`, así que la ceremonia real sigue con el archivo del notario).

- [ ] **Step 7: Punto de commit (solo si el usuario lo pide)**

```bash
git add src/app/ceremonia/CeremonyShow.tsx
git commit -m "La ceremonia abre la urna con la función compartida"
```

---

### Task 4: Urna del demo

**Files:**
- Create: `src/lib/demo/simulate.ts`
- Test: `src/lib/demo/simulate.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`src/lib/demo/simulate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { openAndTallyVotes } from "@/lib/ballots/openVotes";
import { buildVoteBallot, voteBallotBytes } from "@/lib/ballots/vote";
import { generateKeyPair } from "@/lib/crypto/keys";
import { sealPayload } from "@/lib/crypto/seal";
import { DEMO_CATEGORIES, DEMO_SIMULATED_VOTES, DEMO_VOTERS, leaders } from "./fixtures";
import { sealDemoUrn, shuffle, simulatedBallots } from "./simulate";

const categories = DEMO_CATEGORIES.map((c) => ({ id: c.id, finalistIds: c.finalists.map((f) => f.id) }));
const bytes = voteBallotBytes(DEMO_CATEGORIES.length);
const tied = DEMO_CATEGORIES.find((c) => leaders(DEMO_SIMULATED_VOTES[c.id] ?? {}).length > 1)!;
const tiedLeaders = leaders(DEMO_SIMULATED_VOTES[tied.id]!);

describe("simulatedBallots", () => {
  it("arma una papeleta por votante; si la columna se acaba, se abstiene", () => {
    const ballots = simulatedBallots({ cat: { a: 2, b: 1 } }, 4, () => "AAA-222");
    expect(ballots.map((b) => b.votes.cat)).toEqual(["a", "a", "b", null]);
    expect(ballots.every((b) => b.kind === "vote" && b.receipt === "AAA-222")).toBe(true);
  });

  it("es determinista salvo por los comprobantes", () => {
    const votesOf = () => simulatedBallots(DEMO_SIMULATED_VOTES, DEMO_VOTERS).map((b) => b.votes);
    expect(votesOf()).toEqual(votesOf());
  });
});

describe("shuffle", () => {
  it("no pierde ni repite elementos y no toca la lista original", () => {
    const list = [1, 2, 3, 4, 5];
    expect([...shuffle(list)].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(list).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("urna del demo", () => {
  it("se abre con la función de la ceremonia y da ganadores en todas las categorías", async () => {
    const keys = await generateKeyPair();
    const urn = await sealDemoUrn({ keys, table: DEMO_SIMULATED_VOTES, voters: DEMO_VOTERS, ballotBytes: bytes, extra: null });
    expect(urn).toHaveLength(DEMO_VOTERS);
    const results = await openAndTallyVotes(urn, keys, categories);
    expect(results.unreadable).toBe(0);
    expect(results.receipts).toHaveLength(DEMO_VOTERS);
    for (const c of DEMO_CATEGORIES) expect(results.byCategory[c.id]?.winnerIds.length).toBeGreaterThan(0);
    expect(results.byCategory[tied.id]?.winnerIds).toHaveLength(2); // empate compartido
  });

  it("el voto del visitante desempata y su comprobante aparece en la lista", async () => {
    const keys = await generateKeyPair();
    const mine = buildVoteBallot({ [tied.id]: tiedLeaders[1] }, categories.map((c) => c.id), "TUY-234");
    const extra = await sealPayload({ ...mine }, keys.publicKey, bytes);
    const urn = await sealDemoUrn({ keys, table: DEMO_SIMULATED_VOTES, voters: DEMO_VOTERS, ballotBytes: bytes, extra });
    const results = await openAndTallyVotes(urn, keys, categories);
    expect(results.byCategory[tied.id]?.winnerIds).toEqual([tiedLeaders[1]]);
    expect(results.receipts).toContain("TUY-234");
    expect(results.receipts).toHaveLength(DEMO_VOTERS + 1);
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/lib/demo/simulate.test.ts`
Expected: FAIL con `Failed to resolve import "./simulate"`.

- [ ] **Step 3: Implementar**

`src/lib/demo/simulate.ts`:

```ts
import { generateReceiptCode } from "@/lib/ballots/receipt";
import type { VoteBallot } from "@/lib/ballots/vote";
import type { KeyPair } from "@/lib/crypto/keys";
import { sealPayload } from "@/lib/crypto/seal";
import type { VoteTable } from "./fixtures";

// Urna del demo: papeletas de amigos ficticios armadas con una tabla fija de
// votos y selladas igual que las reales. Solo corre en el navegador.

/**
 * Convierte la tabla en papeletas: el votante i lleva, en cada categoría, el
 * voto i de esa columna; si la columna ya se acabó, se abstiene. Siempre da
 * los mismos votos; solo cambian los comprobantes.
 */
export function simulatedBallots(
  table: VoteTable,
  voters: number,
  receipt: () => string = generateReceiptCode,
): VoteBallot[] {
  const columns = Object.entries(table).map(
    ([categoryId, counts]) =>
      [categoryId, Object.entries(counts).flatMap(([finalistId, n]) => Array<string>(n).fill(finalistId))] as const,
  );
  return Array.from({ length: voters }, (_, i) => ({
    v: 1 as const,
    kind: "vote" as const,
    receipt: receipt(),
    votes: Object.fromEntries(columns.map(([categoryId, list]) => [categoryId, list[i] ?? null])),
  }));
}

/** Baraja con crypto.getRandomValues: el orden de la urna no delata nada (regla 9). */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Sella las papeletas simuladas, suma la del visitante (si votó) y baraja la urna. */
export async function sealDemoUrn({
  keys,
  table,
  voters,
  ballotBytes,
  extra,
}: {
  keys: KeyPair;
  table: VoteTable;
  voters: number;
  ballotBytes: number;
  /** Voto sellado del visitante, o null si no votó. */
  extra: string | null;
}): Promise<string[]> {
  const sealed = await Promise.all(
    simulatedBallots(table, voters).map((ballot) => sealPayload({ ...ballot }, keys.publicKey, ballotBytes)),
  );
  return shuffle(extra ? [...sealed, extra] : sealed);
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npx vitest run src/lib/demo/simulate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Punto de commit (solo si el usuario lo pide)**

```bash
git add src/lib/demo/simulate.ts src/lib/demo/simulate.test.ts
git commit -m "Urna simulada del demo"
```

---

### Task 5: Papeletas con `onSubmit` y `doneLink` opcionales

**Files:**
- Modify: `src/app/s/[roomCode]/nominar/NominationBallot.tsx` (import 28, props 51-69, `submit` 105-126, pantalla sellada 128-146)
- Modify: `src/app/s/[roomCode]/votar/VoteBallotForm.tsx` (import 25, props 50-66, `submit` 107-128, pantalla sellada 130-148)

- [ ] **Step 1: `NominationBallot` — import del tipo**

Reemplazar `import { submitNominationAction } from "./actions";` por:

```tsx
import { type SubmitResult, submitNominationAction } from "./actions";
```

- [ ] **Step 2: `NominationBallot` — props**

Reemplazar la firma (líneas 51-69) por:

```tsx
export function NominationBallot({
  roomCode,
  eventName,
  categories,
  candidates,
  rules,
  publicKey,
  ballotBytes,
  selfName,
  onSubmit,
  doneLink,
}: {
  roomCode: string;
  eventName: string;
  categories: CategoryInfo[];
  candidates: Candidate[];
  rules: NominationRules;
  publicKey: string;
  ballotBytes: number;
  selfName: string;
  /** Qué hacer con la papeleta ya sellada. Por defecto se envía al servidor. */
  onSubmit?: (ciphertext: string, receipt: string) => Promise<SubmitResult>;
  /** Botón de la pantalla sellada. Por defecto, «Ver nominados» de la sala. */
  doneLink?: { href: string; label: string };
}) {
```

- [ ] **Step 3: `NominationBallot` — envío**

En `submit()`, reemplazar `const result = await submitNominationAction(roomCode, ciphertext, code);` por:

```tsx
        const send = onSubmit ?? ((sealed: string, receiptCode: string) => submitNominationAction(roomCode, sealed, receiptCode));
        const result = await send(ciphertext, code);
```

- [ ] **Step 4: `NominationBallot` — pantalla sellada**

Justo antes de `if (receipt) {`, agregar:

```tsx
  const done = doneLink ?? { href: `/s/${roomCode}/nominados`, label: "Ver nominados" };
```

y reemplazar el `<Link href={`/s/${roomCode}/nominados`} …>Ver nominados</Link>` por:

```tsx
            <Link href={done.href} className={buttonClasses({ className: "flex-1" })}>
              {done.label}
            </Link>
```

- [ ] **Step 5: `VoteBallotForm` — los mismos cuatro cambios**

1. `import { type SubmitResult, submitVoteAction } from "./actions";`
2. Firma:

```tsx
export function VoteBallotForm({
  roomCode,
  eventName,
  categories,
  allowAbstention,
  publicKey,
  ballotBytes,
  closesAt,
  onSubmit,
  doneLink,
}: {
  roomCode: string;
  eventName: string;
  categories: CategoryInfo[];
  allowAbstention: boolean;
  publicKey: string;
  ballotBytes: number;
  closesAt: string | null;
  /** Qué hacer con el voto ya sellado. Por defecto se envía al servidor. */
  onSubmit?: (ciphertext: string, receipt: string) => Promise<SubmitResult>;
  /** Botón de la pantalla «Voto sellado». Por defecto, «Ver nominados» de la sala. */
  doneLink?: { href: string; label: string };
}) {
```

3. En `submit()`, reemplazar `const result = await submitVoteAction(roomCode, ciphertext, code);` por:

```tsx
        const send = onSubmit ?? ((sealed: string, receiptCode: string) => submitVoteAction(roomCode, sealed, receiptCode));
        const result = await send(ciphertext, code);
```

4. Antes de `if (receipt) {`: `const done = doneLink ?? { href: `/s/${roomCode}/nominados`, label: "Ver nominados" };` y el `Link` de la pantalla sellada pasa a `<Link href={done.href} className={buttonClasses({ className: "flex-1" })}>{done.label}</Link>`.

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: sin errores. Las páginas reales (`nominar/page.tsx`, `votar/page.tsx`) no cambian.

- [ ] **Step 7: Punto de commit (solo si el usuario lo pide)**

```bash
git add "src/app/s/[roomCode]/nominar/NominationBallot.tsx" "src/app/s/[roomCode]/votar/VoteBallotForm.tsx"
git commit -m "Papeletas con envío y botón final configurables"
```

---

### Task 6: Estado, franja y piezas del demo

**Files:**
- Create: `src/app/demo/DemoProvider.tsx`
- Create: `src/app/demo/DemoBanner.tsx`
- Create: `src/app/demo/DemoParts.tsx`
- Create: `src/app/demo/layout.tsx`

- [ ] **Step 1: `DemoProvider`**

`src/app/demo/DemoProvider.tsx`:

```tsx
"use client";

import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { type KeyPair, generateKeyPair } from "@/lib/crypto/keys";

// Estado del demo. Vive solo en memoria (regla 7, aunque sean llaves de
// juguete): se mantiene al pasar de un paso a otro y se borra al recargar o
// al salir del demo. Nada se envía al servidor.

export interface DemoVote {
  receipt: string;
  /** El voto sellado: se suma a la urna de la ceremonia del demo. */
  ciphertext: string;
}

interface DemoState {
  /** Llaves de juguete generadas en este navegador; null mientras se generan. */
  keys: KeyPair | null;
  /** Apertura ficticia de la votación, para la cuenta regresiva de Nominados. */
  votingOpensAt: string | null;
  nominationReceipt: string | null;
  vote: DemoVote | null;
  saveNomination: (receipt: string) => void;
  saveVote: (vote: DemoVote) => void;
  reset: (part: "nomination" | "vote") => void;
}

const DemoContext = createContext<DemoState | null>(null);

const TWO_DAYS_MS = 2 * 24 * 3_600_000;

export function DemoProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<KeyPair | null>(null);
  const [votingOpensAt, setVotingOpensAt] = useState<string | null>(null);
  const [nominationReceipt, setNominationReceipt] = useState<string | null>(null);
  const [vote, setVote] = useState<DemoVote | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la hora se fija en el navegador, nunca en el prerender
    setVotingOpensAt(new Date(Date.now() + TWO_DAYS_MS).toISOString());
    void generateKeyPair().then((pair) => {
      if (!cancelled) setKeys(pair);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const state: DemoState = {
    keys,
    votingOpensAt,
    nominationReceipt,
    vote,
    saveNomination: setNominationReceipt,
    saveVote: setVote,
    reset: (part) => (part === "nomination" ? setNominationReceipt(null) : setVote(null)),
  };
  return <DemoContext.Provider value={state}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoState {
  const state = useContext(DemoContext);
  if (!state) throw new Error("useDemo se usa dentro de <DemoProvider>.");
  return state;
}
```

- [ ] **Step 2: `DemoBanner`**

`src/app/demo/DemoBanner.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useDemo } from "./DemoProvider";

const STEPS = [
  { href: "/demo/nominar", label: "Nominar" },
  { href: "/demo/nominados", label: "Nominados" },
  { href: "/demo/votar", label: "Votar" },
  { href: "/demo/ceremonia", label: "Ceremonia" },
] as const;

/** Franja de noche arriba de todo el demo: recuerda que nada se guarda y lleva los pasos. */
export function DemoBanner() {
  const pathname = usePathname();
  const { nominationReceipt, vote } = useDemo();
  const done: Partial<Record<string, boolean>> = {
    "/demo/nominar": nominationReceipt !== null,
    "/demo/votar": vote !== null,
  };

  return (
    <div className="theme-night sticky top-0 z-10 bg-bg">
      <div className="mx-auto flex max-w-[80rem] flex-wrap items-center justify-between gap-x-6 px-4 sm:px-6 lg:px-10">
        <Link
          href="/demo"
          className="flex min-h-11 items-center gap-2 font-display text-[11px] font-semibold tracking-[0.14em] uppercase"
        >
          <span aria-hidden="true" className="size-2 bg-copper" />
          Demo · nada de esto se guarda
        </Link>
        <Link href="/" className="flex min-h-11 items-center text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline sm:order-last">
          Salir del demo
        </Link>
        <nav aria-label="Pasos del demo" className="-mx-2 flex w-full gap-1 overflow-x-auto text-sm font-semibold sm:mx-0 sm:w-auto sm:flex-1">
          {STEPS.map((step, i) => {
            const current = pathname === step.href;
            return (
              <Link
                key={step.href}
                href={step.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-1.5 border-b-[3px] px-2",
                  current ? "border-copper text-ink" : "border-transparent text-ink-soft hover:text-ink",
                )}
              >
                <span aria-hidden="true" className="font-display text-[11px] text-ink-faint">
                  {i + 1}
                </span>
                {step.label}
                {done[step.href] && (
                  <span className="text-copper">
                    <span aria-hidden="true">✓</span>
                    <span className="sr-only"> (hecho)</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `DemoParts`**

`src/app/demo/DemoParts.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ReceiptCard } from "@/components/ballot/BallotParts";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Esqueleto mientras se generan las llaves de juguete. */
export function DemoLoading({ label }: { label: string }) {
  return (
    <Card className="h-72 animate-pulse" aria-busy="true">
      <span className="sr-only">{label}</span>
    </Card>
  );
}

/** Al volver a un paso ya enviado: el comprobante y la opción de repetirlo. */
export function DemoSent({
  title,
  text,
  code,
  next,
  againLabel,
  onAgain,
}: {
  title: string;
  text: string;
  code: string;
  next: { href: string; label: string };
  againLabel: string;
  onAgain: () => void;
}) {
  return (
    <Card className="mx-auto mt-4 max-w-md space-y-5 text-center">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="text-sm text-ink-soft">{text}</p>
      </div>
      <div className="flex justify-center">
        <ReceiptCard code={code} note="Comprobante del demo" />
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Link href={next.href} className={buttonClasses({ className: "flex-1" })}>
          {next.label}
        </Link>
        <Button variant="secondary" className="flex-1" onClick={onAgain}>
          {againLabel}
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Layout**

`src/app/demo/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { DemoBanner } from "./DemoBanner";
import { DemoProvider } from "./DemoProvider";

// Todo el demo comparte un estado en memoria (llaves de juguete y lo enviado).
export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <DemoProvider>
      <DemoBanner />
      {children}
    </DemoProvider>
  );
}
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

---

### Task 7: Portada del demo (`/demo`)

**Files:**
- Create: `src/app/demo/page.tsx`

- [ ] **Step 1: Escribir la página**

`src/app/demo/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEMO_VOTERS } from "@/lib/demo/fixtures";

export const metadata: Metadata = { title: "Demo" };

const STEPS = [
  { title: "Nominar", text: "Llena la papeleta con un grupo inventado. Se sella en tu navegador, igual que en el evento real." },
  { title: "Nominados", text: "Mira la cartelera con los finalistas de ejemplo, sin conteos." },
  { title: "Votar", text: "Elige un ganador por categoría y guarda tu comprobante." },
  { title: "Ceremonia", text: `Abre la urna y mira la revelación con tu voto y los de ${DEMO_VOTERS} amigos ficticios.` },
];

export default function DemoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <section className="space-y-4">
        <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-ink-soft uppercase">
          <span aria-hidden="true" className="size-2 bg-copper" />
          Pruébalo sin evento
        </p>
        <h1 className="font-display text-4xl leading-[0.95] font-extrabold text-balance uppercase sm:text-6xl">
          Así funciona la premiación
        </h1>
        <p className="max-w-xl text-lg text-pretty text-ink-soft">
          Recorre las cuatro etapas con un grupo inventado. La papeleta, el cifrado y el conteo son los de verdad; el
          grupo y sus votos son simulados. Nada sale de tu navegador.
        </p>
      </section>

      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <Card size="sm" className="h-full space-y-1.5">
              <p className="font-display text-sm font-bold">
                <span className="text-ink-soft">{String(i + 1).padStart(2, "0")}</span> {step.title}
              </p>
              <p className="text-sm text-ink-soft">{step.text}</p>
            </Card>
          </li>
        ))}
      </ol>

      <p className="border-l-[3px] border-copper bg-raised px-4 py-3 text-sm text-ink-soft">
        <strong className="text-ink">Lo que el demo se salta:</strong> el registro con PIN, la aprobación del organizador
        y el notario que abre las nominaciones. En el evento real, los finalistas salen de lo que nominó el grupo.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link href="/demo/nominar" className={buttonClasses({ size: "lg", className: "max-sm:w-full" })}>
          Empezar →
        </Link>
        <Link href="/transparencia" className={buttonClasses({ variant: "secondary", size: "lg", className: "max-sm:w-full" })}>
          ¿Quién puede ver mi voto?
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

---

### Task 8: Pasos Nominar y Votar del demo

**Files:**
- Create: `src/app/demo/nominar/page.tsx`, `src/app/demo/nominar/DemoNominate.tsx`
- Create: `src/app/demo/votar/page.tsx`, `src/app/demo/votar/DemoVote.tsx`

- [ ] **Step 1: `DemoNominate`**

`src/app/demo/nominar/DemoNominate.tsx`:

```tsx
"use client";

import { useState } from "react";
import { NominationBallot } from "@/app/s/[roomCode]/nominar/NominationBallot";
import { nominationBallotBytes } from "@/lib/ballots/nomination";
import {
  DEMO_CANDIDATES,
  DEMO_CATEGORIES,
  DEMO_EVENT_NAME,
  DEMO_ROOM_CODE,
  DEMO_RULES,
  DEMO_SELF_NAME,
} from "@/lib/demo/fixtures";
import { DemoLoading, DemoSent } from "../DemoParts";
import { useDemo } from "../DemoProvider";

const categories = DEMO_CATEGORIES.map(({ id, name, description, type }) => ({ id, name, description, type }));

export function DemoNominate() {
  const { keys, nominationReceipt, saveNomination, reset } = useDemo();
  // «Ya enviaste» solo al volver al paso: justo después de enviar se ve la pantalla sellada real.
  const [showSent, setShowSent] = useState(() => nominationReceipt !== null);

  if (!keys) return <DemoLoading label="Preparando tu papeleta…" />;
  if (showSent && nominationReceipt) {
    return (
      <DemoSent
        title="Ya enviaste tus nominaciones del demo"
        text="En el evento real se puede una sola vez. Aquí puedes repetirlo cuantas veces quieras."
        code={nominationReceipt}
        next={{ href: "/demo/nominados", label: "Ver nominados →" }}
        againLabel="Nominar de nuevo"
        onAgain={() => {
          reset("nomination");
          setShowSent(false);
        }}
      />
    );
  }
  return (
    <NominationBallot
      roomCode={DEMO_ROOM_CODE}
      eventName={DEMO_EVENT_NAME}
      categories={categories}
      candidates={DEMO_CANDIDATES}
      rules={DEMO_RULES}
      publicKey={keys.publicKey}
      ballotBytes={nominationBallotBytes(DEMO_CATEGORIES.length, DEMO_RULES.max)}
      selfName={DEMO_SELF_NAME}
      onSubmit={async (_ciphertext, receipt) => {
        // Ya va sellada con la llave del demo; no sale del navegador.
        saveNomination(receipt);
        return { ok: true };
      }}
      doneLink={{ href: "/demo/nominados", label: "Ver nominados" }}
    />
  );
}
```

- [ ] **Step 2: Página de Nominar**

`src/app/demo/nominar/page.tsx`:

```tsx
import type { Metadata } from "next";
import { DemoNominate } from "./DemoNominate";

export const metadata: Metadata = { title: "Demo · Nominar" };

export default function DemoNominatePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-2.5 pt-2 pb-8 sm:px-4 lg:max-w-5xl lg:pt-6">
      <DemoNominate />
    </main>
  );
}
```

- [ ] **Step 3: `DemoVote`**

`src/app/demo/votar/DemoVote.tsx`:

```tsx
"use client";

import { useState } from "react";
import { VoteBallotForm } from "@/app/s/[roomCode]/votar/VoteBallotForm";
import { voteBallotBytes } from "@/lib/ballots/vote";
import { DEMO_ALLOW_ABSTENTION, DEMO_CATEGORIES, DEMO_EVENT_NAME, DEMO_ROOM_CODE, byName } from "@/lib/demo/fixtures";
import { DemoLoading, DemoSent } from "../DemoParts";
import { useDemo } from "../DemoProvider";

const categories = DEMO_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  type: c.type,
  finalists: byName(c.finalists).map((f) => ({ id: f.id, name: f.name, photoUrl: null, blurb: f.blurb })),
}));

export function DemoVote() {
  const { keys, vote, saveVote, reset } = useDemo();
  const [showSent, setShowSent] = useState(() => vote !== null);

  if (!keys) return <DemoLoading label="Preparando tu papeleta…" />;
  if (showSent && vote) {
    return (
      <DemoSent
        title="Ya votaste en el demo"
        text="Tu voto sellado espera en la urna del demo. Ábrela en la ceremonia y busca tu comprobante."
        code={vote.receipt}
        next={{ href: "/demo/ceremonia", label: "Ir a la ceremonia →" }}
        againLabel="Votar de nuevo"
        onAgain={() => {
          reset("vote");
          setShowSent(false);
        }}
      />
    );
  }
  return (
    <VoteBallotForm
      roomCode={DEMO_ROOM_CODE}
      eventName={DEMO_EVENT_NAME}
      categories={categories}
      allowAbstention={DEMO_ALLOW_ABSTENTION}
      publicKey={keys.publicKey}
      ballotBytes={voteBallotBytes(DEMO_CATEGORIES.length)}
      closesAt={null}
      onSubmit={async (ciphertext, receipt) => {
        // Se guarda sellado en memoria y se suma a la urna de la ceremonia del demo.
        saveVote({ receipt, ciphertext });
        return { ok: true };
      }}
      doneLink={{ href: "/demo/ceremonia", label: "Ir a la ceremonia" }}
    />
  );
}
```

- [ ] **Step 4: Página de Votar**

`src/app/demo/votar/page.tsx`:

```tsx
import type { Metadata } from "next";
import { DemoVote } from "./DemoVote";

export const metadata: Metadata = { title: "Demo · Votar" };

export default function DemoVotePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-2.5 pt-2 pb-8 sm:px-4 lg:max-w-5xl lg:pt-6">
      <DemoVote />
    </main>
  );
}
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

---

### Task 9: Paso Nominados del demo

**Files:**
- Create: `src/app/demo/nominados/page.tsx`, `src/app/demo/nominados/DemoNominees.tsx`

- [ ] **Step 1: `DemoNominees`**

`src/app/demo/nominados/DemoNominees.tsx`:

```tsx
"use client";

import Link from "next/link";
import { type BoardCategory, NomineesBoard } from "@/app/s/[roomCode]/nominados/NomineesBoard";
import { buttonClasses } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import { DEMO_CATEGORIES, byName } from "@/lib/demo/fixtures";
import { useDemo } from "../DemoProvider";

// Finalistas en orden alfabético y sin conteos, como la cartelera real (regla 8).
const board: BoardCategory[] = DEMO_CATEGORIES.map((c, i) => ({
  id: c.id,
  num: String(i + 1).padStart(2, "0"),
  name: c.name,
  description: c.description,
  type: c.type,
  finalists: byName(c.finalists).map((f) => ({
    id: f.id,
    name: f.name,
    photoUrl: null,
    blurb: f.blurb,
    external: f.participantId === null,
  })),
}));
const totalFinalists = board.reduce((sum, c) => sum + c.finalists.length, 0);

export function DemoNominees() {
  const { votingOpensAt } = useDemo();
  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 pt-1 lg:pt-4">
        <div className="max-w-[36rem] flex-[1_1_28rem] space-y-2.5 lg:space-y-3">
          <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-ink-soft uppercase lg:text-[13px]">
            <span className="size-2 bg-copper" aria-hidden="true" />
            Pronto la votación final
          </p>
          <h1 className="font-display text-[34px] leading-[0.95] font-extrabold uppercase sm:text-5xl lg:text-[64px]">
            Los nominados
          </h1>
          <p className="text-ink-soft lg:text-[17px] lg:leading-normal">
            {totalFinalists} nominados en {board.length} categorías, en orden alfabético y sin conteos. En el evento real
            salen de lo que nominó el grupo; aquí son de ejemplo.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {votingOpensAt && <Countdown title="La votación abre en" target={votingOpensAt} />}
          <Link href="/demo/votar" className={buttonClasses({ size: "lg", className: "max-sm:w-full" })}>
            Ir a votar →
          </Link>
        </div>
      </section>

      <NomineesBoard revealed categories={board} slots={4} revealNote="Se revela pronto" />
    </>
  );
}
```

- [ ] **Step 2: Página**

`src/app/demo/nominados/page.tsx`:

```tsx
import type { Metadata } from "next";
import { DemoNominees } from "./DemoNominees";

export const metadata: Metadata = { title: "Demo · Nominados" };

export default function DemoNomineesPage() {
  return (
    <main className="mx-auto w-full max-w-[80rem] flex-1 space-y-5 px-4 pt-4 pb-10 sm:px-6 lg:space-y-8 lg:px-10 lg:pb-14">
      <DemoNominees />
    </main>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

---

### Task 10: Paso Ceremonia del demo

**Files:**
- Create: `src/app/demo/ceremonia/page.tsx`, `src/app/demo/ceremonia/DemoCeremony.tsx`

- [ ] **Step 1: `DemoCeremony`**

`src/app/demo/ceremonia/DemoCeremony.tsx`:

```tsx
"use client";

import Link from "next/link";
import { CeremonyShow } from "@/app/ceremonia/CeremonyShow";
import { voteBallotBytes } from "@/lib/ballots/vote";
import {
  DEMO_CATEGORIES,
  DEMO_EVENT_NAME,
  DEMO_SIMULATED_VOTES,
  DEMO_VOTERS,
  byName,
  demoRevealOrder,
} from "@/lib/demo/fixtures";
import { sealDemoUrn } from "@/lib/demo/simulate";
import { DemoLoading } from "../DemoParts";
import { useDemo } from "../DemoProvider";

const categories = demoRevealOrder().map((c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  type: c.type,
  finalists: byName(c.finalists).map((f) => ({ id: f.id, name: f.name, photoUrl: null, blurb: f.blurb })),
}));

export function DemoCeremony() {
  const { keys, vote } = useDemo();

  if (!keys) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
        <DemoLoading label="Preparando la ceremonia…" />
      </main>
    );
  }

  const intro = vote ? (
    <>
      Se abren tu voto y los de {DEMO_VOTERS} amigos ficticios, aquí en tu navegador, con la llave del demo. Antes de los
      ganadores se proyectan los comprobantes: busca el tuyo, <strong className="text-ink">{vote.receipt}</strong>.
    </>
  ) : (
    <>
      Todavía no votaste: la urna se abre igual, solo con los votos de {DEMO_VOTERS} amigos ficticios.{" "}
      <Link href="/demo/votar" className="font-semibold text-ink underline decoration-copper decoration-2 underline-offset-4">
        Votar primero
      </Link>
    </>
  );

  return (
    <CeremonyShow
      eventName={DEMO_EVENT_NAME}
      publicKey={keys.publicKey}
      showWinnerPercent={false}
      categories={categories}
      intro={intro}
      openBallots={async () => ({
        keys,
        ciphertexts: await sealDemoUrn({
          keys,
          table: DEMO_SIMULATED_VOTES,
          voters: DEMO_VOTERS,
          ballotBytes: voteBallotBytes(DEMO_CATEGORIES.length),
          extra: vote?.ciphertext ?? null,
        }),
      })}
    />
  );
}
```

- [ ] **Step 2: Página**

`src/app/demo/ceremonia/page.tsx` (sin `<main>` propio: `CeremonyShow` ya trae el suyo):

```tsx
import type { Metadata } from "next";
import { DemoCeremony } from "./DemoCeremony";

export const metadata: Metadata = { title: "Demo · Ceremonia" };

export default function DemoCeremonyPage() {
  return <DemoCeremony />;
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: sin errores; todos los tests pasan.

- [ ] **Step 4: Punto de commit (solo si el usuario lo pide)**

```bash
git add src/app/demo
git commit -m "Demo para probar: nominar, nominados, votar y ceremonia"
```

---

### Task 11: Botón «Pruébalo» en la portada

**Files:**
- Modify: `src/app/page.tsx:35-46` (la tarjeta «¿Cómo entro?»)

- [ ] **Step 1: Cambiar la tarjeta**

Reemplazar el `<Link href="/transparencia" …>¿Quién puede ver mi voto?</Link>` dentro de la tarjeta por:

```tsx
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/demo" className={buttonClasses({ className: "max-sm:w-full" })}>
            Pruébalo: demo
          </Link>
          <Link href="/transparencia" className={buttonClasses({ variant: "secondary", className: "max-sm:w-full" })}>
            ¿Quién puede ver mi voto?
          </Link>
        </div>
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

---

### Task 12: Página de diseño (`public/diseno.html`)

**Files:**
- Create: `public/diseno.html`

- [ ] **Step 1: Escribir el archivo**

`public/diseno.html`:

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Diseño · Día y noche</title>
<meta name="description" content="El sistema de diseño «Día y noche» de la app de premiaciones del grupo: colores, tipografía, forma, componentes y pantallas.">
<meta name="theme-color" content="#e9e1d3">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,600;0,700;1,400&family=Unbounded:wght@600;700;800&display=swap">
<!--
  Presentación del diseño «Día y noche» (CLAUDE.md §9).
  Archivo autónomo: los valores se copian de src/app/globals.css y de los
  componentes de src/components. Si el diseño cambia, actualízalos aquí también.
-->
<style>
  :root {
    --bg: #e9e1d3; --sheet: #f8f4ec; --raised: #ffffff; --sand: #e2d7c5;
    --line: #ddd2c0; --line-strong: #a99e8b;
    --ink: #141a19; --ink-soft: #55605d;
    --copper: #d9783f; --copper-duo: #d08050;
    --sage: #5e9488; --sage-duo: #7fafa4; --kraft: #c9a57b;
    --success: #2f6b3a; --danger: #b3261e;
    --beam: rgb(255 255 255 / 0.5);
    --accent: var(--copper); --accent-duo: var(--copper-duo);
    --display: "Unbounded", ui-sans-serif, system-ui, sans-serif;
    --sans: "Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif;
    color-scheme: light;
  }
  /* Noche: la tinta pasa a ser el cielo y la hoja pasa a ser la luz */
  .night {
    --bg: #141a19; --sheet: #1d2523; --raised: #232d2a; --sand: #2c3633;
    --line: #2c3633; --line-strong: #3d4945;
    --ink: #f8f4ec; --ink-soft: #c9c2b6; --ink-faint: #93a39e;
    --success: #8fd19e; --danger: #f2a199;
    --beam: rgb(248 244 236 / 0.05);
    color-scheme: dark; background: var(--bg); color: var(--ink);
  }
  .honor { --accent: var(--sage); --accent-duo: var(--sage-duo); }

  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 var(--sans); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  h1, h2, h3, p, ol, ul, dl, dd, figure { margin: 0; }
  ol, ul { padding: 0; list-style: none; }
  a { color: inherit; }
  :focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  ::selection { background: color-mix(in oklab, var(--copper) 45%, transparent); }

  /* Haces de luz del fondo */
  .beams { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
  .beams::before, .beams::after { content: ""; position: absolute; inset: -10% -20%; background: linear-gradient(112deg, transparent 32%, var(--beam) 41%, transparent 50%); animation: drift 18s ease-in-out infinite alternate; }
  .beams::after { background: linear-gradient(112deg, transparent 56%, var(--beam) 62%, transparent 69%); opacity: .7; animation-duration: 24s; animation-direction: alternate-reverse; }
  @keyframes drift { from { transform: translateX(-3%); } to { transform: translateX(3%); } }

  /* Chaflán: esquina superior izquierda e inferior derecha cortadas en diagonal */
  .ch { clip-path: polygon(var(--c, 12px) 0, 100% 0, 100% calc(100% - var(--c, 12px)), calc(100% - var(--c, 12px)) 100%, 0 100%, 0 var(--c, 12px)); }
  .ch-tl { clip-path: polygon(var(--c, 14px) 0, 100% 0, 100% 100%, 0 100%, 0 var(--c, 14px)); }

  .wrap { max-width: 72rem; margin: 0 auto; padding: 0 16px; }
  @media (min-width: 640px) { .wrap { padding: 0 24px; } }
  .muted { color: var(--ink-soft); }
  .eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--ink-soft); }
  .eyebrow::before { content: ""; width: 8px; height: 8px; background: var(--copper); }
  .label { font: 600 10px/1.3 var(--display); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-soft); }
  .grid { display: grid; gap: 16px; }
  @media (min-width: 640px) { .g2, .g3, .g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (min-width: 960px) { .g3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } .g4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } }

  /* Cabecera */
  header.top { border-bottom: 1px solid color-mix(in oklab, var(--line-strong) 50%, transparent); }
  header.top .wrap { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; column-gap: 24px; }
  .logo { display: inline-flex; align-items: center; gap: 10px; padding: 14px 0; font: 600 12px/1 var(--display); letter-spacing: .14em; text-transform: uppercase; text-decoration: none; }
  .logo svg { width: 18px; height: 20px; color: var(--copper); flex: none; }
  nav.toc { display: flex; flex-wrap: wrap; column-gap: 18px; font-size: 14px; font-weight: 600; }
  nav.toc a { display: inline-flex; align-items: center; min-height: 44px; color: var(--ink-soft); text-decoration: none; }
  nav.toc a:hover { color: var(--ink); }

  /* Secciones con doble regla (2px + 1px de tinta) */
  section { padding: 44px 0; }
  .sec-head { display: grid; gap: 8px; margin-bottom: 28px; padding-top: 3px; border-top: 2px solid var(--ink); }
  .sec-head::before { content: ""; border-top: 1px solid var(--ink); margin-bottom: 12px; }
  .sec-head h2 { font: 700 clamp(26px, 4vw, 40px)/1.05 var(--display); }
  .sec-head p { max-width: 42rem; color: var(--ink-soft); }

  /* Portada */
  .hero { padding: 40px 0 16px; }
  .hero h1 { margin: 14px 0 18px; font: 800 clamp(48px, 12vw, 128px)/.9 var(--display); text-transform: uppercase; }
  .hero .lead { max-width: 40rem; font-size: 18px; color: var(--ink-soft); }
  .duo { --c: 28px; display: grid; margin-top: 32px; }
  @media (min-width: 720px) { .duo { grid-template-columns: 1fr 1fr; } }
  .duo > div { display: grid; gap: 14px; align-content: start; justify-items: start; padding: 28px 24px 32px; }
  .duo .day { background: var(--sheet); }
  .duo-title { font: 700 26px/1.1 var(--display); }

  /* Botones, filtros y chips */
  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 20px; font: 700 15px/1 var(--sans); color: var(--ink); text-decoration: none; }
  .btn-primary { --c: 12px; background: var(--copper); color: #141a19; font: 700 12px/1 var(--display); letter-spacing: .06em; text-transform: uppercase; }
  .btn-secondary { border: 1.5px solid var(--ink); }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
  .filter { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border: 1px solid var(--line-strong); font-size: 14px; font-weight: 700; }
  .filter.on { background: var(--ink); border-color: var(--ink); color: var(--sheet); }
  .chip { display: inline-flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 12px; border: 1px solid var(--line-strong); background: var(--raised); font-size: 14px; font-weight: 600; }
  .chip::before { content: ""; width: 8px; height: 8px; background: var(--accent); }
  .stamp { --c: 6px; display: inline-block; transform: rotate(-8deg); padding: 7px 10px; background: var(--accent); color: #141a19; font: 700 10px/1 var(--display); letter-spacing: .16em; text-transform: uppercase; }
  .field { display: grid; gap: 6px; max-width: 22rem; }
  .field span:first-child { font-size: 14px; font-weight: 600; }
  .input { display: flex; align-items: center; min-height: 48px; padding: 0 14px; border: 1.5px solid var(--line-strong); background: var(--raised); color: var(--ink-soft); }
  .check { --c: 7px; display: grid; place-items: center; width: 32px; height: 32px; flex: none; padding: 2px; background: var(--ink); }
  .check > span { --c: 6px; width: 100%; height: 100%; background: var(--raised); }
  .check.on { padding: 0; background: var(--copper); }
  .check.on svg { width: 16px; height: 16px; }
  .seal { width: 56px; height: 56px; }

  /* Tarjeta: el borde de 1px con chaflán es una capa del color del borde con la hoja encima */
  .card { --c: 18px; position: relative; isolation: isolate; padding: 20px; background: var(--line); }
  .card::before { content: ""; position: absolute; inset: 1px; z-index: -1; background: var(--sheet); clip-path: polygon(17px 0, 100% 0, 100% calc(100% - 17px), calc(100% - 17px) 100%, 0 100%, 0 17px); }
  .card h3 { font: 700 18px/1.2 var(--display); margin-bottom: 6px; }

  /* Colores */
  .swatch { display: grid; gap: 10px; }
  .swatch .color { --c: 14px; height: 84px; background: var(--sw); box-shadow: inset 0 0 0 1px rgb(20 26 25 / .1); }
  .night .swatch .color { box-shadow: inset 0 0 0 1px rgb(248 244 236 / .12); }
  .swatch dt { font: 700 13px/1.25 var(--display); }
  .swatch code { font: 600 11px/1.4 var(--display); letter-spacing: .04em; color: var(--ink-soft); }
  .swatch dd { font-size: 14px; color: var(--ink-soft); }
  .panel { --c: 24px; padding: 28px 20px; }
  @media (min-width: 640px) { .panel { padding: 32px 28px; } }
  .panel + .panel, .grid + .panel, .panel + .grid { margin-top: 20px; }
  .note { margin-top: 18px; padding: 12px 16px; border-left: 3px solid var(--copper); background: var(--raised); color: var(--ink-soft); font-size: 15px; }
  .note strong { color: var(--ink); }

  /* Tipografía */
  .aa { font-size: clamp(72px, 14vw, 120px); line-height: .9; }
  .weights { display: flex; flex-wrap: wrap; gap: 6px 22px; font-size: 22px; }
  .t-h1 { font: 800 clamp(34px, 6vw, 64px)/.95 var(--display); text-transform: uppercase; }
  .t-h2 { font: 700 25px/1.08 var(--display); }
  .t-blurb { font-style: italic; color: var(--ink-soft); }
  .t-code { font: 700 28px/1 var(--display); letter-spacing: .12em; }
  .scale > * + * { margin-top: 14px; }

  /* Forma */
  .shapes { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
  .shape { display: grid; place-items: center; background: var(--ink); color: var(--sheet); font: 700 12px/1 var(--display); }
  .bordered { --c: 18px; padding: 1px; background: var(--ink); }
  .bordered > div { --c: 17px; padding: 18px; background: var(--sheet); }
  pre.code { --c: 12px; margin: 0; overflow-x: auto; padding: 16px; background: #141a19; color: #f8f4ec; font: 13px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace; }

  /* Papeleta */
  .ballot { max-width: 30rem; }
  .rule { display: grid; gap: 3px; margin-bottom: 14px; }
  .rule .r { display: flex; justify-content: space-between; font: 600 10px/1 var(--display); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-soft); }
  .rule .r2 { border-top: 2px solid var(--ink); }
  .rule .r1 { border-top: 1px solid var(--ink); }
  .cat-head { position: relative; display: grid; gap: 6px; margin-bottom: 16px; padding-right: 88px; }
  .cat-head h3 { font: 700 24px/1.08 var(--display); }
  .cat-head .stamp { position: absolute; top: 16px; right: -2px; }
  .vote-row { --c: 10px; position: relative; isolation: isolate; display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--line); }
  .vote-row::before { content: ""; position: absolute; inset: 1px; z-index: -1; background: var(--raised); clip-path: polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px); }
  .vote-row.on { background: var(--copper); }
  .vote-row + .vote-row { margin-top: 8px; }
  .ini { --c: 10px; display: grid; place-items: center; width: 52px; height: 52px; flex: none; background: var(--sand); color: var(--ink); font: 800 18px/1 var(--display); }
  .who { display: grid; flex: 1; gap: 2px; min-width: 0; }
  .who b { font: 700 14px/1.2 var(--display); }
  .who i { font-size: 13px; color: var(--ink-soft); }
  .tag { padding: 4px 6px; background: var(--copper); color: #141a19; font: 700 9px/1 var(--display); letter-spacing: .12em; text-transform: uppercase; }

  /* Cuenta regresiva (pedacito de noche) */
  .units { display: flex; gap: 6px; margin-top: 8px; }
  .unit { --c: 9px; display: grid; justify-items: center; gap: 2px; width: 76px; padding: 8px 0 6px; background: var(--bg); }
  .unit b { font: 700 30px/1 var(--display); color: var(--copper); font-variant-numeric: tabular-nums; }
  .unit span { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-soft); }
  @media (max-width: 420px) { .unit { width: 62px; } .unit b { font-size: 22px; } }

  /* Voto sellado */
  .sealed { display: grid; justify-items: center; gap: 18px; padding: 8px 0; text-align: center; }
  .envelope { position: relative; width: 250px; height: 170px; filter: drop-shadow(0 14px 18px rgb(20 26 25 / .18)); }
  .envelope > div { position: absolute; }
  .env-back { inset: 0; background: var(--kraft); }
  .env-flap { top: 0; left: 0; right: 0; height: 100px; background: color-mix(in oklab, var(--kraft) 85%, var(--ink)); clip-path: polygon(0 0, 100% 0, 50% 100%); }
  .env-front { bottom: 0; left: 0; right: 0; height: 110px; background: color-mix(in oklab, var(--kraft) 80%, white); clip-path: polygon(0 100%, 50% 18%, 100% 100%); }
  .envelope .seal { position: absolute; top: 68px; left: 93px; width: 64px; height: 64px; }
  .receipt { --c: 12px; display: grid; justify-items: center; gap: 6px; padding: 14px 28px; transform: rotate(-1.5deg); }
  .receipt .code { font: 700 28px/1 var(--display); letter-spacing: .12em; color: var(--copper); }

  /* Cartelera */
  .stage { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  @media (min-width: 720px) { .stage { gap: 20px; } }
  .frame { --c: 14px; padding: 1px; background: var(--accent); }
  .frame.dark { background: var(--ink); }
  .frame > div { --c: 13px; position: relative; aspect-ratio: 7 / 8; overflow: hidden; }
  .facedown { display: grid; place-items: center; height: 100%; background-color: #141a19; background-image: radial-gradient(color-mix(in oklab, var(--accent) 30%, transparent) 1.2px, transparent 1.6px); background-size: 12px 12px; }
  .diamond { display: grid; place-items: center; width: 52px; height: 52px; transform: rotate(45deg); border: 1.5px solid var(--accent); background: #141a19; }
  .diamond svg { width: 22px; height: 24px; transform: rotate(-45deg); color: var(--accent); }
  .big-ini { display: grid; place-items: center; height: 100%; background: var(--sand); font: 800 clamp(26px, 5vw, 52px)/1 var(--display); }
  .duotone { height: 100%; background: var(--accent-duo); }
  .duotone svg { display: block; width: 100%; height: 100%; mix-blend-mode: multiply; }
  .no { position: absolute; top: 8px; left: 8px; padding: 3px 6px; background: var(--accent); color: #141a19; font: 700 10px/1 var(--display); letter-spacing: .1em; }
  .outside { position: absolute; right: 8px; bottom: 8px; padding: 3px 6px; background: #141a19; color: #f8f4ec; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  .floor { height: 3px; background: var(--ink); }
  .nominee b { display: block; padding-top: 10px; font: 700 clamp(12px, 1.6vw, 16px)/1.2 var(--display); }
  .nominee i { display: block; margin-top: 2px; font-size: clamp(11px, 1.4vw, 14px); color: var(--ink-soft); }

  /* Premiación (16:9, escala con el ancho) */
  .gala { --c: 24px; position: relative; container-type: inline-size; aspect-ratio: 16 / 9; overflow: hidden; background: var(--bg); }
  .gala > * { position: absolute; }
  .gala .num { top: -1cqw; left: 42cqw; font: 800 40cqw/1 var(--display); letter-spacing: -.04em; color: transparent; -webkit-text-stroke: .16cqw color-mix(in oklab, var(--accent) 16%, transparent); }
  .gala .ground { left: 0; right: 0; top: 80%; bottom: 0; background: color-mix(in oklab, var(--bg) 75%, black); }
  .gala svg.lines { left: 0; top: 80%; width: 100%; height: 20%; }
  .gala .spot { inset: 0; background: rgb(248 244 236 / .035); }
  .gala .s1 { clip-path: polygon(0 0, 5.5% 0, 40.6% 83%, 25.8% 83%); }
  .gala .s2 { clip-path: polygon(94.5% 0, 100% 0, 95.3% 83%, 77.3% 83%); }
  .gala .s3 { background: rgb(248 244 236 / .05); clip-path: polygon(19.5% 0, 28% 0, 43.7% 83%, 3% 83%); }
  .gala .content { inset: 0; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 4cqw; padding: 0 6cqw 4cqw; }
  .gala .cat { font: 600 1.4cqw/1 var(--display); letter-spacing: .16em; text-transform: uppercase; color: var(--accent); }
  .gala h3 { margin-top: 1.2cqw; font: 800 4.6cqw/1 var(--display); text-transform: uppercase; }
  .gala .finals { display: flex; gap: 1.6cqw; margin-top: 3cqw; }
  .gala .fin { display: grid; gap: .8cqw; width: 10cqw; }
  .gala .portrait { --c: 1.4cqw; aspect-ratio: 7 / 8; padding: .25cqw; background: var(--accent); }
  .gala .portrait span { --c: 1.2cqw; display: grid; place-items: center; height: 100%; background: var(--sheet); color: var(--accent); font: 800 3cqw/1 var(--display); }
  .gala .fin small { font: 700 1.2cqw/1.2 var(--display); }
  .gala .fin.dim { opacity: .4; }
  .gala .win { justify-self: start; margin-top: .6cqw; padding: .4cqw .8cqw; background: var(--accent); color: #141a19; font: 700 1cqw/1 var(--display); letter-spacing: .12em; text-transform: uppercase; }
  .gala .trophy { width: 14cqw; height: auto; }
  .tr-a { fill: var(--accent); }
  .tr-light { fill: color-mix(in oklab, var(--accent) 60%, white); }
  .tr-dark { fill: color-mix(in oklab, var(--accent) 85%, black); }
  .tr-darker { fill: color-mix(in oklab, var(--accent) 70%, black); }
  .tr-base { fill: color-mix(in oklab, var(--accent) 55%, black); }

  /* Reglas */
  .rules { display: grid; gap: 12px; counter-reset: r; }
  .rules li { display: grid; grid-template-columns: auto 1fr; gap: 14px; align-items: start; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
  .rules li::before { counter-increment: r; content: counter(r, decimal-leading-zero); font: 700 13px/1.6 var(--display); color: var(--ink-soft); }
  .rules strong { font-weight: 700; }

  footer { padding: 40px 0 64px; }

  @media (prefers-reduced-motion: reduce) {
    .beams::before, .beams::after { animation: none; }
  }
</style>
</head>
<body>
<div class="beams" aria-hidden="true"></div>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="mark" viewBox="0 0 18 20"><path fill="currentColor" d="M9 0l3 3-3 3-3-3z"/><path fill="currentColor" fill-opacity=".6" d="M6.5 7.5h5L18 20H0z"/></symbol>
    <symbol id="seal" viewBox="0 0 30 30">
      <path fill="#d9783f" d="M15 1.5l2.6 1.9 3.2-.4 1.4 2.9 2.9 1.4-.4 3.2 1.9 2.6-1.9 2.6.4 3.2-2.9 1.4-1.4 2.9-3.2-.4L15 28.5l-2.6-1.9-3.2.4-1.4-2.9-2.9-1.4.4-3.2L3.4 15l1.9-2.6-.4-3.2 2.9-1.4 1.4-2.9 3.2.4z"/>
      <circle cx="15" cy="15" r="7.5" fill="none" stroke="#141a19" stroke-opacity=".3"/>
      <path fill="#141a19" fill-opacity=".7" d="M15 10.5l1.5 1.5-1.5 1.5-1.5-1.5z M13.2 14.2h3.6L19 20h-8z"/>
    </symbol>
    <symbol id="tick" viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="#141a19" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  </defs>
</svg>

<header class="top">
  <div class="wrap">
    <a class="logo" href="#inicio"><svg aria-hidden="true"><use href="#mark"/></svg>Premios del Grupo</a>
    <nav class="toc" aria-label="Secciones">
      <a href="#colores">Colores</a>
      <a href="#tipografia">Tipografía</a>
      <a href="#forma">Forma</a>
      <a href="#componentes">Componentes</a>
      <a href="#pantallas">Pantallas</a>
      <a href="#reglas">Reglas</a>
    </nav>
  </div>
</header>

<main id="inicio">
  <section class="hero">
    <div class="wrap">
      <p class="eyebrow">Sistema de diseño</p>
      <h1>Día y noche</h1>
      <p class="lead">Una sola identidad con dos momentos. De día, la web donde el grupo nomina y vota: hoja clara y tinta oscura. De noche, la premiación en el proyector: los mismos colores con los papeles cambiados. La tinta pasa a ser el cielo y la hoja, la luz.</p>
      <div class="duo ch">
        <div class="day">
          <span class="label">De día · la web</span>
          <p class="duo-title">Nominar, votar, ver a los nominados</p>
          <span class="btn btn-primary ch">Sellar y enviar</span>
        </div>
        <div class="night">
          <span class="label">De noche · la gala</span>
          <p class="duo-title">La premiación en el proyector</p>
          <span class="btn btn-primary ch">Revelar ganador</span>
        </div>
      </div>
    </div>
  </section>

  <section id="colores">
    <div class="wrap">
      <div class="sec-head">
        <span class="label">01</span>
        <h2>Colores</h2>
        <p>Pocos y con papeles fijos. De noche no hay colores nuevos: se intercambian la tinta y la hoja.</p>
      </div>

      <h3 class="label" style="margin-bottom:14px">De día</h3>
      <dl class="grid g4">
        <div class="swatch"><div class="color ch" style="--sw:#e9e1d3"></div><dt>Fondo</dt><code>--bg · #E9E1D3</code><dd>Fondo de la web</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#f8f4ec"></div><dt>Hoja</dt><code>--sheet · #F8F4EC</code><dd>Papeletas, fichas y paneles</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#ffffff"></div><dt>Elevado</dt><code>--raised · #FFFFFF</code><dd>Fila elegida y sugerencias</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#e2d7c5"></div><dt>Arena</dt><code>--sand · #E2D7C5</code><dd>Iniciales cuando no hay foto</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#ddd2c0"></div><dt>Línea</dt><code>--line · #DDD2C0</code><dd>Bordes y separadores</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#a99e8b"></div><dt>Línea fuerte</dt><code>--line-strong · #A99E8B</code><dd>Chips y filtros sin elegir</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#141a19"></div><dt>Tinta</dt><code>--ink · #141A19</code><dd>Texto principal</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#55605d"></div><dt>Tinta suave</dt><code>--ink-soft · #55605D</code><dd>Texto secundario</dd></div>
      </dl>

      <div class="night panel ch">
        <h3 class="label" style="margin-bottom:14px">De noche</h3>
        <dl class="grid g4">
          <div class="swatch"><div class="color ch" style="--sw:#141a19"></div><dt>Cielo</dt><code>--bg · #141A19</code><dd>Fondo de la premiación</dd></div>
          <div class="swatch"><div class="color ch" style="--sw:#1d2523"></div><dt>Panel</dt><code>--sheet · #1D2523</code><dd>Paneles de noche</dd></div>
          <div class="swatch"><div class="color ch" style="--sw:#2c3633"></div><dt>Línea</dt><code>--line · #2C3633</code><dd>Líneas de noche</dd></div>
          <div class="swatch"><div class="color ch" style="--sw:#f8f4ec"></div><dt>Luz</dt><code>--ink · #F8F4EC</code><dd>Texto principal de noche</dd></div>
          <div class="swatch"><div class="color ch" style="--sw:#c9c2b6"></div><dt>Luz suave</dt><code>--ink-soft · #C9C2B6</code><dd>Texto secundario</dd></div>
          <div class="swatch"><div class="color ch" style="--sw:#93a39e"></div><dt>Luz tenue</dt><code>--ink-faint · #93A39E</code><dd>Texto terciario</dd></div>
        </dl>
      </div>

      <h3 class="label" style="margin:28px 0 14px">Acentos y estados</h3>
      <dl class="grid g4">
        <div class="swatch"><div class="color ch" style="--sw:#d9783f"></div><dt>Cobre</dt><code>--copper · #D9783F</code><dd>Premios y botón primario</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#5e9488"></div><dt>Salvia</dt><code>--sage · #5E9488</code><dd>Categorías honoríficas</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#d08050"></div><dt>Cobre duotono</dt><code>--copper-duo · #D08050</code><dd>Fotos de premio</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#7fafa4"></div><dt>Salvia duotono</dt><code>--sage-duo · #7FAFA4</code><dd>Fotos honoríficas</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#c9a57b"></div><dt>Kraft</dt><code>--kraft · #C9A57B</code><dd>Sobre de «Voto sellado»</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#2f6b3a"></div><dt>Éxito</dt><code>--success · #2F6B3A</code><dd>De noche, #8FD19E</dd></div>
        <div class="swatch"><div class="color ch" style="--sw:#b3261e"></div><dt>Error</dt><code>--danger · #B3261E</code><dd>De noche, #F2A199</dd></div>
      </dl>
      <p class="note"><strong>Los acentos no cambian de tono:</strong> el cobre y la salvia son idénticos de día y de noche. Sobre fondos claros nunca son texto chico; van de relleno, con tinta encima.</p>
    </div>
  </section>

  <section id="tipografia">
    <div class="wrap">
      <div class="sec-head">
        <span class="label">02</span>
        <h2>Tipografía</h2>
        <p>Solo dos familias. Unbounded habla fuerte: títulos, números, etiquetas, botones y códigos. Schibsted Grotesk se encarga de leer: textos, nombres y la frase de cada nominado.</p>
      </div>
      <div class="grid g2">
        <div class="card">
          <span class="label">Unbounded · 600 / 700 / 800</span>
          <p class="aa" style="font-family:var(--display);font-weight:800;margin:14px 0">Aa</p>
          <p class="weights" style="font-family:var(--display)"><span style="font-weight:600">Semi</span><span style="font-weight:700">Bold</span><span style="font-weight:800">Extra</span></p>
        </div>
        <div class="card">
          <span class="label">Schibsted Grotesk · 400 / 600 / 700 / itálica</span>
          <p class="aa" style="font-weight:700;margin:14px 0">Aa</p>
          <p class="weights"><span>Regular</span><span style="font-weight:600">Semi</span><span style="font-weight:700">Bold</span><span style="font-style:italic">Itálica</span></p>
        </div>
      </div>
      <div class="card scale" style="margin-top:16px">
        <p class="eyebrow">Votación final abierta</p>
        <p class="t-h1">Los nominados</p>
        <p class="t-h2">Chef del grupo</p>
        <p class="muted">Quién cocina mejor en las juntas. Elige a uno; tu voto se sella en tu dispositivo.</p>
        <p class="t-blurb">«Su ceviche tiene lista de espera.»</p>
        <p class="t-code">K7M-29Q</p>
      </div>
    </div>
  </section>

  <section id="forma">
    <div class="wrap">
      <div class="sec-head">
        <span class="label">03</span>
        <h2>Forma: el chaflán</h2>
        <p>Tarjetas, botones, etiquetas y fotos llevan una esquina cortada en diagonal arriba a la izquierda y otra abajo a la derecha. Es la firma de la identidad.</p>
      </div>
      <div class="grid g2">
        <div>
          <div class="shapes">
            <div class="shape ch" style="--c:6px;width:64px;height:64px">6</div>
            <div class="shape ch" style="--c:12px;width:96px;height:96px">12</div>
            <div class="shape ch" style="--c:18px;width:128px;height:128px">18</div>
            <div class="shape ch-tl" style="--c:16px;width:112px;height:128px;background:var(--copper);color:#141a19">foto</div>
          </div>
          <div class="bordered ch" style="margin-top:20px">
            <div class="ch"><strong>Borde fino con chaflán.</strong> <span class="muted">Un contenedor del color del borde con 1 px de padding y la hoja encima: el borde sigue la diagonal.</span></div>
          </div>
        </div>
        <pre class="code ch"><code>clip-path: polygon(
  N 0, 100% 0,
  100% calc(100% - N),
  calc(100% - N) 100%,
  0 100%, 0 N
);</code></pre>
      </div>
    </div>
  </section>

  <section id="componentes">
    <div class="wrap">
      <div class="sec-head">
        <span class="label">04</span>
        <h2>Componentes</h2>
        <p>Botones de al menos 48 px de alto, foco siempre visible y el cobre como relleno, nunca como letra chica sobre claro.</p>
      </div>
      <div class="grid g2">
        <div class="card">
          <h3>Botones</h3>
          <div class="row"><span class="btn btn-primary ch">Sellar y enviar</span><span class="btn btn-secondary">← Anterior</span></div>
          <h3 style="margin-top:20px">Filtros</h3>
          <div class="row"><span class="filter on">Todas</span><span class="filter">Premio</span><span class="filter">Honoríficas</span></div>
        </div>
        <div class="card">
          <h3>Chips y sellos</h3>
          <div class="row"><span class="chip">Premio</span><span class="chip honor">Honorífica</span></div>
          <div class="row" style="margin-top:22px;gap:22px"><span class="stamp ch">Premio</span><span class="stamp ch honor">Honorífica</span><svg class="seal" aria-hidden="true"><use href="#seal"/></svg></div>
        </div>
        <div class="card">
          <h3>Campo</h3>
          <label class="field"><span>Tu nombre</span><span class="input">Como te conoce el grupo</span></label>
        </div>
        <div class="card">
          <h3>Casillas</h3>
          <div class="row" style="gap:14px">
            <span class="check ch"><span class="ch"></span></span><span class="muted">Sin marcar</span>
            <span class="check on ch"><svg aria-hidden="true"><use href="#tick"/></svg></span><span class="muted">Tu voto</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="pantallas">
    <div class="wrap">
      <div class="sec-head">
        <span class="label">05</span>
        <h2>Pantallas</h2>
        <p>Piezas reales de la app, en miniatura: la papeleta de día, los pedacitos de noche dentro de la web y la premiación.</p>
      </div>

      <div class="grid g2">
        <div class="card ballot">
          <div class="rule"><div class="r"><span>Papeleta de votación</span><span>Nº 03</span></div><div class="r2"></div><div class="r1"></div></div>
          <div class="cat-head">
            <span class="label">Categoría</span>
            <h3>Chef del grupo</h3>
            <p class="muted">Quién cocina mejor en las juntas.</p>
            <span class="stamp ch">Premio</span>
          </div>
          <div class="vote-row on ch">
            <span class="ini ch">CR</span>
            <span class="who"><b>Camila Rojas</b><i>Su ceviche tiene lista de espera.</i></span>
            <span class="tag">Tu voto</span>
            <span class="check on ch"><svg aria-hidden="true"><use href="#tick"/></svg></span>
          </div>
          <div class="vote-row ch">
            <span class="ini ch">HM</span>
            <span class="who"><b>Hugo Medina</b><i>El dueño indiscutido de la parrilla.</i></span>
            <span class="check ch"><span class="ch"></span></span>
          </div>
        </div>

        <div class="grid" style="align-content:start">
          <div class="card">
            <span class="label">Cuenta regresiva</span>
            <div class="units" role="img" aria-label="Faltan 1 día, 12 horas y 30 minutos">
              <span class="unit night ch"><b>01</b><span>días</span></span>
              <span class="unit night ch"><b>12</b><span>h</span></span>
              <span class="unit night ch"><b>30</b><span>min</span></span>
            </div>
          </div>
          <div class="card sealed">
            <div class="envelope" aria-hidden="true">
              <div class="env-back"></div><div class="env-flap"></div><div class="env-front"></div>
              <svg class="seal"><use href="#seal"/></svg>
            </div>
            <div class="receipt night ch"><span class="label">Tu comprobante</span><span class="code">K7M-29Q</span><span class="label">Se proyecta en la gala</span></div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <span class="label">Cartelera · antes y después de revelar</span>
        <div class="grid g2" style="margin-top:16px;gap:28px">
          <ol class="stage">
            <li class="nominee"><div class="frame dark ch-tl"><div class="ch-tl"><div class="facedown"><span class="diamond"><svg aria-hidden="true"><use href="#mark"/></svg></span></div></div></div><div class="floor"></div><b>Nominado Nº 01</b><i>Se revela pronto</i></li>
            <li class="nominee honor"><div class="frame dark ch-tl"><div class="ch-tl"><div class="facedown"><span class="diamond"><svg aria-hidden="true"><use href="#mark"/></svg></span></div></div></div><div class="floor"></div><b>Nominado Nº 02</b><i>Se revela pronto</i></li>
            <li class="nominee"><div class="frame dark ch-tl"><div class="ch-tl"><div class="facedown"><span class="diamond"><svg aria-hidden="true"><use href="#mark"/></svg></span></div></div></div><div class="floor"></div><b>Nominado Nº 03</b><i>Se revela pronto</i></li>
          </ol>
          <ol class="stage">
            <li class="nominee"><div class="frame ch-tl"><div class="ch-tl"><div class="duotone"><svg viewBox="0 0 70 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="ph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8d8d8"/><stop offset="1" stop-color="#7a7a7a"/></linearGradient></defs><rect width="70" height="80" fill="url(#ph)"/><circle cx="35" cy="31" r="13" fill="#4a4a4a"/><path d="M9 80c3-19 14-27 26-27s23 8 26 27z" fill="#3c3c3c"/></svg></div><span class="no">Nº 01</span></div></div><div class="floor"></div><b>Camila Rojas</b><i>Foto en duotono</i></li>
            <li class="nominee"><div class="frame ch-tl"><div class="ch-tl"><span class="big-ini">HM</span><span class="no">Nº 02</span></div></div><div class="floor"></div><b>Hugo Medina</b><i>Sin foto: iniciales</i></li>
            <li class="nominee honor"><div class="frame ch-tl"><div class="ch-tl"><span class="big-ini">TR</span><span class="no">Nº 03</span><span class="outside">Fuera del grupo</span></div></div><div class="floor"></div><b>La tía Rosa</b><i>Referente externo</i></li>
          </ol>
        </div>
      </div>

      <div class="gala night ch" style="margin-top:16px" role="img" aria-label="Escena de la premiación: categoría número 3, Chef del grupo, con el trofeo de cobre y los finalistas; gana Camila Rojas">
        <span class="num" aria-hidden="true">03</span>
        <div class="ground"></div>
        <svg class="lines" viewBox="0 0 1280 142" preserveAspectRatio="none" aria-hidden="true"><path d="M640 0 L-200 142 M640 0 L100 142 M640 0 L380 142 M640 0 L640 142 M640 0 L900 142 M640 0 L1180 142 M640 0 L1480 142 M0 30 L1280 30 M0 70 L1280 70 M0 122 L1280 122" stroke="rgb(248 244 236 / .06)" fill="none"/><path d="M0 0 L1280 0" stroke="rgb(217 120 63 / .35)" stroke-width="1.5"/></svg>
        <div class="spot s1"></div><div class="spot s2"></div><div class="spot s3"></div>
        <div class="content">
          <div>
            <p class="cat">Premio · Categoría 03</p>
            <h3>Chef del grupo</h3>
            <div class="finals">
              <div class="fin"><div class="portrait ch"><span class="ch">CR</span></div><small>Camila Rojas</small><span class="win">Gana</span></div>
              <div class="fin dim"><div class="portrait ch"><span class="ch">HM</span></div><small>Hugo Medina</small></div>
              <div class="fin dim"><div class="portrait ch"><span class="ch">EV</span></div><small>Elena Vargas</small></div>
            </div>
          </div>
          <svg class="trophy" viewBox="0 0 180 420" aria-hidden="true">
            <path class="tr-light" d="M90 0 L114 26 L90 52 L66 26 Z"/>
            <path class="tr-a" d="M90 0 L114 26 L90 26 Z"/>
            <path class="tr-dark" d="M66 26 L90 52 L90 26 Z"/>
            <path class="tr-dark" d="M76 66 L104 66 L150 300 L30 300 Z"/>
            <path class="tr-a" d="M90 66 L104 66 L150 300 L90 300 Z"/>
            <path class="tr-light" fill-opacity=".55" d="M90 66 L97 66 L120 300 L90 300 Z"/>
            <path class="tr-darker" d="M76 66 L90 66 L90 300 L30 300 Z"/>
            <path class="tr-base" d="M30 300 L150 300 L140 318 L40 318 Z"/>
            <path fill="#1d2523" d="M24 330 L156 330 L170 344 L170 404 L156 418 L24 418 L10 404 L10 344 Z"/>
            <path fill="#2c3633" d="M24 330 L156 330 L170 344 L10 344 Z"/>
            <path d="M10 344 L170 344" stroke="#d9783f" stroke-width="2"/>
            <text x="90" y="384" text-anchor="middle" font-family="Unbounded, sans-serif" font-weight="700" font-size="11" letter-spacing="2" fill="#d9783f">2026</text>
          </svg>
        </div>
      </div>
    </div>
  </section>

  <section id="reglas">
    <div class="wrap">
      <div class="sec-head">
        <span class="label">06</span>
        <h2>Reglas</h2>
        <p>Lo que no se negocia, para que todo el grupo pueda leer y tocar la app sin esfuerzo.</p>
      </div>
      <ol class="rules">
        <li><p><strong>Contraste AA</strong> en todo el texto, de día y de noche.</p></li>
        <li><p><strong>Cobre y salvia nunca son texto chico sobre claro:</strong> van de relleno (sellos, etiquetas, casilla marcada, botón primario) con tinta encima. Sobre la noche sí pueden ser texto.</p></li>
        <li><p><strong>Botones de al menos 48 px de alto</strong> y foco siempre visible al navegar con teclado.</p></li>
        <li><p><strong>Fotos siempre en duotono</strong> (cobre para premio, salvia para honoríficas) para igualar fotos de distinta calidad; sin foto, iniciales en tinta sobre arena.</p></li>
        <li><p><strong>Menos movimiento si se pide:</strong> con «reducir movimiento» activado, los haces de luz y las animaciones se quedan quietos.</p></li>
        <li><p><strong>Sin conteos a la vista:</strong> los nominados van en orden alfabético y en la gala solo se muestra al ganador.</p></li>
      </ol>
    </div>
  </section>
</main>

<footer>
  <div class="wrap row">
    <a class="btn btn-primary ch" href="https://nomination-awards-ten.vercel.app/demo">Probar el demo</a>
    <a class="btn btn-secondary" href="https://github.com/Hocchik/NominationAwards">Ver el código</a>
  </div>
</footer>
</body>
</html>
```

- [ ] **Step 2: Verificar que se sirve y no desborda**

Con el servidor de desarrollo corriendo (`npm run dev`), abrir `http://localhost:3000/diseno.html` en el navegador integrado y comprobar con JavaScript en la página:

```js
[document.title, document.documentElement.scrollWidth <= window.innerWidth]
```

Expected: `["Diseño · Día y noche", true]` a 375 px y a 1280 px de ancho (`resize_window` preset `mobile` y luego `desktop`).

- [ ] **Step 3: Punto de commit (solo si el usuario lo pide)**

```bash
git add public/diseno.html src/app/page.tsx
git commit -m "Página de diseño y acceso al demo desde la portada"
```

---

### Task 13: CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` §7 (después de la tabla de «Participante», antes de «### Notario»)

- [ ] **Step 1: Agregar la sección**

```markdown
### Demo y diseño (públicas)
| Ruta | Pantalla |
|---|---|
| `/demo` | Demo para probar sin evento: portada y cuatro pasos (`/demo/nominar`, `/demo/nominados`, `/demo/votar`, `/demo/ceremonia`) con un grupo ficticio (`src/lib/demo/fixtures.ts`). Usa los componentes reales con props opcionales (`onSubmit`, `doneLink`, `openBallots`, `intro`); cifra con llaves de juguete en memoria y no toca la base ni las server actions |
| `/diseno.html` | Archivo autónomo (`public/diseno.html`) que presenta el sistema «Día y noche». Copia los valores de `globals.css`: actualizarlo si el diseño cambia |
```

- [ ] **Step 2: Punto de commit (solo si el usuario lo pide)**

```bash
git add CLAUDE.md
git commit -m "CLAUDE.md: rutas del demo y de la página de diseño"
```

---

### Task 14: Verificación final

- [ ] **Step 1: Tests, tipos y lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: todos los tests pasan (incluye los 16 nuevos: 9 de fixtures, 2 de openVotes, 5 de simulate); sin errores de tipos ni de lint.

- [ ] **Step 2: Recorrido del demo en el navegador integrado**

Con `npm run dev` (vía `preview_start`), recorrer en el navegador integrado:

1. `/` → botón «Pruébalo: demo» → `/demo` → «Empezar».
2. `/demo/nominar`: nominar 3 nombres en una categoría (las demás se pueden omitir) → «Sellar y enviar» → pantalla «Nominaciones selladas» con comprobante → «Ver nominados». La franja marca ✓ en Nominar.
3. `/demo/nominados`: cartelera revelada, filtros Premio/Honoríficas, cuenta regresiva → «Ir a votar».
4. `/demo/votar`: votar en «Siempre llega tarde» por Fabián Soto (abstenerse en el resto) → «Voto sellado» → «Ir a la ceremonia».
5. `/demo/ceremonia`: el texto de inicio muestra tu comprobante → «Abrir la urna» → «✓ Votos abiertos: 21» → «Comenzar la ceremonia» → avanzar con Espacio; la lista de comprobantes incluye el tuyo; en «Siempre llega tarde» gana solo Fabián Soto.
6. Volver a `/demo/votar` → tarjeta «Ya votaste en el demo» → «Votar de nuevo» muestra la papeleta.

- [ ] **Step 3: Sin peticiones al servidor**

Después del recorrido, en el navegador integrado: `read_network_requests` con `urlPattern: "/demo"` y revisar que no haya ningún `POST` (las server actions de Next viajan como `POST` con cabecera `Next-Action`). Expected: solo `GET` de páginas y recursos.

- [ ] **Step 4: Revisión visual**

Capturas con Edge headless (script `shots/shoot.mjs` del scratchpad) a 375 px y 1280 px de `/demo`, `/demo/nominar`, `/demo/nominados`, `/demo/votar`, `/demo/ceremonia` (inicio y una diapositiva de ganador) y `/diseno.html`. Revisar: sin scroll horizontal, la franja no tapa contenido, la ceremonia cubre la franja, el cobre nunca es texto chico sobre claro.

- [ ] **Step 5: Las páginas reales no cambiaron**

Revisar el diff de `src/app/s/[roomCode]/nominar/page.tsx`, `src/app/s/[roomCode]/votar/page.tsx` y `src/app/ceremonia/page.tsx`: deben quedar sin cambios (`git diff --stat` no los lista).

- [ ] **Step 6: Punto de commit / push (solo si el usuario lo pide)**

Recordar al usuario que el push a `main` despliega a producción en Vercel.
