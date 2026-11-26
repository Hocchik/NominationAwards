import type { CategoryFraming, CategoryType, NomineeKind } from "@/generated/prisma/enums";
import type { Candidate } from "@/lib/ballots/nomination";
import { type FinalistDisplay, type GuestInfo, finalistDisplay } from "@/lib/event/finalistDisplay";

// Datos del demo (/demo): un grupo y unas categorías inventadas. Los IDs son
// UUID v4 fijos para que las mismas funciones y esquemas del evento real los
// acepten. Nada de esto se guarda en la base ni sale del navegador.

export interface DemoFinalist {
  id: string;
  name: string;
  blurb: string;
  /** Participante del grupo ficticio; null = referente de fuera o una opción. */
  participantId: string | null;
  /** La otra mitad, en las categorías de parejas. */
  partnerParticipantId?: string;
  /** Opción del organizador (profes). */
  optionId?: string;
}

export interface DemoOption {
  id: string;
  label: string;
  blurb: string;
}

export interface DemoCategory {
  id: string;
  name: string;
  description: string;
  type: CategoryType;
  framing: CategoryFraming;
  nomineeKind: NomineeKind;
  maxPicks: number;
  minPicks: number;
  allowExternal: boolean;
  finalistCount: number;
  options: DemoOption[];
  finalists: DemoFinalist[];
}

export const DEMO_EVENT_NAME = "Premios de prueba";
/** Solo nombra los borradores que las papeletas guardan en sessionStorage. */
export const DEMO_ROOM_CODE = "DEMO";
/** Se puede dejar una categoría vacía al nominar, como en el evento real. */
export const DEMO_ALLOW_SKIP = true;

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

const DEMO_PEOPLE: Candidate[] = [
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

/**
 * Apodos y otros nombres del grupo ficticio: el primero es el apodo que se ve;
 * los demás (segundo nombre, apellido) solo sirven para buscar.
 */
export const DEMO_ALIASES: Record<string, string[]> = {
  [P.gabriela]: ["Gabi", "Andrea"],
  [P.julian]: ["Juli"],
  [P.fabian]: ["Fabi", "Soto"],
};

export const DEMO_CANDIDATES: Candidate[] = DEMO_PEOPLE.map((p) => ({ ...p, aliases: DEMO_ALIASES[p.id] ?? [] }));

const C = {
  party: "f8572abf-0d8e-4d25-b9e4-64ed1d57eb39",
  late: "5074c316-03cc-4f74-810f-a95e53496394",
  ship: "3fbff61f-32ac-4ad0-873f-b1627cc5f2f2",
  story: "27b991d7-2122-41e4-9e81-76b0ff5bc937",
  friend: "fe57b5f6-cd0e-48fe-8850-66c8fcfab12d",
  ex: "8c1f0a52-6d3e-4b7a-9f21-3e5d7a9b0c14",
  teacher: "30230433-ff30-45b4-9115-60f5684d421e",
} as const;



const F = {
  partyBruno: "3e0aabb0-e1ff-4e91-921f-a19ce6313688",
  partyGabriela: "9ea772b9-aa10-46b7-99d5-558513149873",
  partyJulian: "6094c598-7f14-4647-9d5e-48a72a1e751e",
  partyLucia: "0f0fc290-1f97-4c8d-9bfc-864338c8340d",
  lateDiego: "b9830707-ec4c-4179-a2d9-5e057cdfcc41",
  lateFabian: "d3f03593-f401-4360-8026-9223b2fcf535",
  lateInes: "7e413f49-dced-4b0a-b32b-8b65886d69a6",
  shipBrunoLucia: "463b3914-4855-43fe-b31c-39f784a9a0ff",
  shipCamilaHugo: "5a7c19f6-481c-4adf-93ae-2a63ebcbc1be",
  shipDiegoElena: "208f8606-29c5-42d0-9c63-72ec34ce3968",
  storyMateo: "aa89ed8a-3524-46f6-876b-32c459f1770c",
  storyAna: "235baa05-848a-49e0-971f-daec9048f87c",
  storyBruno: "edcc6d6a-6d89-4705-9c90-de8965cb2403",
  storyGabriela: "1db9c76c-dd54-4e47-88e4-129a179e24e9",
  friendInes: "78b6d377-3fcc-44fb-9272-128526e71bbe",
  friendHugo: "139bf71c-a914-49c5-b82f-6a1c66c7bda8",
  friendAna: "9fb1dba7-ba82-4737-a7c6-7e92043ab09f",
  exMateo: "eaaa68fe-3317-4794-88f6-448b13ebd446",
  exElena: "74dbd322-798b-4821-87e3-b420dd958038",
  exJulian: "d49ea772-78d8-42ae-94a4-49ea7fbdd6ad",
  teacherRamirez: "5d0a6b3e-7f8c-4a9b-8c1d-3e4f5a6b7c8d",
  teacherCarmen: "6e1b7c4f-8a9d-4b0c-9d2e-4f5a6b7c8d9e",
  teacherValdivia: "7f2c8d5a-9b0e-4c1d-8e3f-5a6b7c8d9e0f",
} as const;

const person: Omit<DemoCategory, "id" | "name" | "description" | "type" | "finalists"> = {
  framing: "NORMAL",
  nomineeKind: "PERSON",
  maxPicks: 1,
  minPicks: 0,
  allowExternal: false,
  finalistCount: 4,
  options: [],
};

export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    ...person,
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
    ...person,
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
    ...person,
    id: C.ship,
    name: "El mejor shipeo",
    description: "La pareja que todos queremos ver junta (pon dos nombres).",
    type: "PRIZE",
    nomineeKind: "PAIR",
    maxPicks: 2,
    finalists: [
      { id: F.shipBrunoLucia, name: "Bruno Díaz y Lucía Fernández", participantId: P.bruno, partnerParticipantId: P.lucia, blurb: "" },
      { id: F.shipCamilaHugo, name: "Camila Rojas y Hugo Medina", participantId: P.camila, partnerParticipantId: P.hugo, blurb: "" },
      { id: F.shipDiegoElena, name: "Diego Paredes y Elena Vargas", participantId: P.diego, partnerParticipantId: P.elena, blurb: "" },
    ],
  },
  {
    ...person,
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
    ...person,
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
    ...person,
    id: C.ex,
    name: "regresar con su ex",
    description: "Quién es más probable que vuelva con su ex antes de fin de año.",
    type: "HONORARY",
    framing: "PRONE",
    finalists: [
      { id: F.exMateo, name: "Mateo Salazar", participantId: P.mateo, blurb: "" },
      { id: F.exElena, name: "Elena Vargas", participantId: P.elena, blurb: "" },
      { id: F.exJulian, name: "Julián Herrera", participantId: P.julian, blurb: "" },
    ],
  },
  {
    ...person,
    id: C.teacher,
    name: "Mejor profe",
    description:
      "El profe que más nos marcó en la carrera. Escribe el nombre de 1 o 2 profes (al menos 1). Al cierre, el organizador junta los nombres del mismo profe y pasan los más escritos.",
    type: "HONORARY",
    nomineeKind: "TEXT",
    maxPicks: 2,
    minPicks: 1,
    finalistCount: 3,
    finalists: [
      { id: F.teacherRamirez, name: "Ing. Ramírez", participantId: null, blurb: "" },
      { id: F.teacherCarmen, name: "Miss Carmen", participantId: null, blurb: "" },
      { id: F.teacherValdivia, name: "Dr. Valdivia", participantId: null, blurb: "" },
    ],
  },
];

const DEMO_GUESTS = new Map<string, GuestInfo>(
  DEMO_PEOPLE.map((p) => [p.id, { displayName: p.name, aliases: DEMO_ALIASES[p.id] ?? [], photoUrl: null }]),
);

/** Cómo se muestra un finalista del demo (foto, apodo, pareja), con la misma función que el evento real. */
export function demoFinalistDisplay(f: DemoFinalist, nomineeKind?: NomineeKind): FinalistDisplay {
  return finalistDisplay(
    {
      displayName: f.name,
      participantId: f.participantId,
      partnerParticipantId: f.partnerParticipantId ?? null,
      optionId: f.optionId ?? null,
      photoUrl: null,
    },
    DEMO_GUESTS,
    nomineeKind,
  );
}

/**
 * Ganadores de ejemplo para el paso «Ganador» del demo (no salen de ningún
 * voto). «Siempre llega tarde» empata, para mostrar cómo se ve un premio compartido.
 */
export const DEMO_EXAMPLE_WINNERS: Record<string, string[]> = {
  [C.party]: [F.partyBruno],
  [C.late]: [F.lateDiego, F.lateFabian],
  [C.ship]: [F.shipBrunoLucia],
  [C.story]: [F.storyMateo],
  [C.friend]: [F.friendInes],
  [C.ex]: [F.exMateo],
  [C.teacher]: [F.teacherRamirez],
};

/**
 * Puestos 2.º a 4.º de ejemplo, también inventados: el resto de finalistas en el
 * orden de la categoría, con el puesto que seguiría a los ganadores. En «Amigo
 * fiel» el último queda sin puesto, para mostrar a quien tuvo 0 votos.
 */
export const DEMO_EXAMPLE_PLACES: Record<string, Record<string, number>> = Object.fromEntries(
  DEMO_CATEGORIES.map((c) => {
    const winners = DEMO_EXAMPLE_WINNERS[c.id] ?? [];
    let others = c.finalists.filter((f) => !winners.includes(f.id));
    if (c.id === C.friend) others = others.slice(0, -1);
    return [c.id, Object.fromEntries(others.slice(0, 4 - winners.length).map((f, i) => [f.id, winners.length + 1 + i]))];
  }),
);

/** Orden alfabético en español, como muestran los finalistas las páginas reales (regla 8). */
export function byName<T extends { name: string }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
}
