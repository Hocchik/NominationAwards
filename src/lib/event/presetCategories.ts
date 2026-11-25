import type { CategoryFraming, CategoryType, NomineeKind } from "@/generated/prisma/enums";

// Las 25 categorías de Premios del Grupo (decisiones del usuario, 2026-11-21 y
// 2026-11-22), listas para cargar con un botón en /admin/categorias. Cada una
// trae su criterio: qué cuenta para elegir (y qué no). Siempre gana uno.
//
// `sortOrder`: orden en Nominados y al nominar, dentro de su grupo (premios
// primero, luego honoríficas). `revealOrder`: orden de la ceremonia, con el
// ritmo «2 premios → 1 honorífica → 1 más propenso», cierre emotivo y EOTY al final.

export interface PresetCategory {
  name: string;
  description: string;
  type: CategoryType;
  framing: CategoryFraming;
  nomineeKind: NomineeKind;
  maxPicks: number;
  minPicks: number;
  finalistCount: number;
  sortOrder: number;
  revealOrder: number;
}

type Extra = Partial<Omit<PresetCategory, "name" | "description" | "sortOrder" | "revealOrder">>;

const prize = (sortOrder: number, revealOrder: number, name: string, description: string, extra: Extra = {}): PresetCategory => ({
  name,
  description,
  type: "PRIZE",
  framing: "NORMAL",
  nomineeKind: "PERSON",
  // Hasta 3 nombres y al menos 1 (decisión del usuario, 2026-11-22): más datos para el top N.
  maxPicks: 3,
  minPicks: 1,
  finalistCount: 4,
  sortOrder,
  revealOrder,
  ...extra,
});

const honor = (sortOrder: number, revealOrder: number, name: string, description: string, extra: Extra = {}): PresetCategory =>
  prize(sortOrder, revealOrder, name, description, { type: "HONORARY", ...extra });

const prone = (sortOrder: number, revealOrder: number, name: string, description: string) =>
  honor(sortOrder, revealOrder, name, description, { framing: "PRONE" });

export const PRESET_CATEGORIES: PresetCategory[] = [
  // Premios (13)
  prize(0, 1, "El alma de la fiesta",
    "Quién hace que cualquier junta se vuelva fiesta: arma el plan, pone la música y contagia las ganas. No es quien más toma, es quien más anima."),
  prize(1, 2, "El/la más pepa",
    "Quién se ve más guapo/a o atractivo/a del grupo. Cuenta cómo se ve siempre, no una sola foto con suerte."),
  prize(2, 5, "El/la más borracho/a",
    "Quién se pasó de tragos más veces este año y dejó las mejores (o peores) historias. Cuentan las veces y las anécdotas, no cuánto aguanta."),
  prize(3, 6, "El/la más sano/a",
    "Quién lleva la vida más sana: no toma o toma poco, se cuida, hace deporte… y aun así la pasa bien con todos."),
  prize(4, 9, "El/la frío/a de fríos",
    "Quién menos demuestra lo que siente: responde seco, no se engancha con nadie y ningún drama lo/la mueve. Frío/a en lo emocional, no antipático/a."),
  prize(5, 10, "El/la más migajero/a",
    "Quién se conforma con poquito en el amor: acepta las migajas de atención de alguien que no le da su lugar… y vuelve por más."),
  prize(6, 13, "El mejor shipeo",
    "La pareja que el grupo quiere ver junta, sean o no pareja hoy. Elige a las dos personas. Cuenta la química que se nota, no solo lo que te gustaría a ti.",
    { nomineeKind: "PAIR", maxPicks: 1 }),
  prize(7, 14, "El mejor dúo",
    "Las dos personas que más se complementan como amigos o compañeros: siempre juntos, se entienden sin hablar y juntos rinden más. No es romance (para eso está el shipeo). Elige a las dos.",
    { nomineeKind: "PAIR", maxPicks: 1 }),
  prize(8, 17, "El showman",
    "Quién siempre se roba la atención: hace reír, baila, cuenta historias o arma el show donde esté. El/la protagonista de cualquier reunión."),
  prize(9, 18, "Evento del año",
    "El momento que vivimos juntos y que más recordamos de este año. Aquí no se nomina: el organizador eligió los eventos (con sus fotos) y en la votación eliges el mejor.",
    { nomineeKind: "DIRECT", maxPicks: 1, minPicks: 0 }),
  prize(10, 21, "Revelación del año",
    "La persona que conociste mejor este año y te cayó súper bien. Puede ser alguien nuevo en el grupo o alguien de siempre a quien recién descubriste."),
  prize(11, 22, "El/la amigo/a de todos",
    "«Sin ti no habría sido igual». Quién se lleva bien con absolutamente todos: habla con todos, une al grupo y con él/ella nadie se siente fuera. No es tu mejor amigo/a: es el de todos."),
  prize(12, 25, "EOTY · Engineer of the Year",
    "El/la ingeniero/a del año: quién más se lució en la carrera este año por sus notas, proyectos, prácticas o por cómo ayudó a los demás en los cursos. El premio mayor de la noche."),

  // Honoríficas (12): normales, «más propenso/a a…», texto libre y la pregunta
  honor(0, 3, "Chill de cojones",
    "Quién vive más relajado/a: nada lo/la estresa, ni los parciales ni los dramas, y te contagia la calma."),
  prone(1, 4, "perderlo todo en las apuestas",
    "Quién es más probable que apueste hasta lo que no tiene: casino, apuestas deportivas, retos… lo que sea."),
  honor(2, 7, "El lanzador de factos",
    "Quién dice las verdades que nadie se atreve a decir, sin filtro y con razón. Directo/a, pero certero/a."),
  prone(3, 8, "caer en cana",
    "Quién es más probable que termine pasando una noche en la comisaría (por loco/a, no por malo/a)."),
  honor(4, 11, "La mejor frase",
    "La frase más memorable del año dicha por alguien del grupo. Escríbela como la recuerdes; puedes poner 1 o 2. Al cierre, el organizador junta las que son la misma frase (sin saber quién las escribió) y pasan las más escritas.",
    { nomineeKind: "TEXT", maxPicks: 2, minPicks: 1, finalistCount: 3 }),
  prone(5, 12, "regresar con su ex",
    "Quién es más probable que vuelva con su ex (otra vez), aunque jure que ya lo superó."),
  honor(6, 15, "El/la mejor compañero/a de trabajo grupal",
    "Con quién siempre quieres hacer el trabajo en grupo: cumple, aporta ideas, avisa y no desaparece antes de la entrega."),
  prone(7, 16, "volverse gay",
    "Quién es más probable que un día nos sorprenda saliendo del clóset. Solo por diversión: es una broma entre amigos."),
  honor(8, 19, "Mejor profe",
    "El profe que más nos marcó en la carrera: por cómo enseñaba, por su buena onda o porque nos salvó. Escribe el nombre de 1 o 2 profes (al menos 1). Al cierre, el organizador junta los nombres del mismo profe y pasan los más escritos.",
    { nomineeKind: "TEXT", maxPicks: 2, minPicks: 1 }),
  prone(9, 20, "terminar enseñando en la universidad",
    "Quién es más probable que termine dictando clases en la universidad: le encanta explicar y ya parece profe."),
  honor(10, 23, "El/la más infravalorado/a",
    "Quién pasa desapercibido/a pero es un capo: hace su chamba en los trabajos, ayuda sin pedir nada y merece más reconocimiento del que recibe."),
  honor(11, 24, "¿Con quién dejarías a tu hijo/a?",
    "La persona en quien más confías: responsable, cariñosa y que cuidaría lo que más quieres como si fuera suyo.",
    { framing: "QUESTION" }),
];
