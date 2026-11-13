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

export const DEMO_EVENT_NAME = "Premios de prueba";
/** Solo nombra los borradores que las papeletas guardan en sessionStorage. */
export const DEMO_ROOM_CODE = "DEMO";
export const DEMO_RULES: NominationRules = { min: 3, max: 5, allowSkip: true };
export const DEMO_ALLOW_ABSTENTION = true;

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
 * Ganadores de ejemplo para el paso «Ganador» del demo (no salen de ningún
 * voto). «Siempre llega tarde» empata, para mostrar cómo se ve un premio compartido.
 */
export const DEMO_EXAMPLE_WINNERS: Record<string, string[]> = {
  [C.party]: [F.partyBruno],
  [C.late]: [F.lateDiego, F.lateFabian],
  [C.chef]: [F.chefCamila],
  [C.story]: [F.storyMateo],
  [C.friend]: [F.friendInes],
  [C.idol]: [F.idolRosa],
};

/** Orden alfabético en español, como muestran los finalistas las páginas reales (regla 8). */
export function byName<T extends { name: string }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
}
