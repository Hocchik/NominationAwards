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
    "Reconoce a la persona que transforma cualquier reunión en una celebración: propone el plan, anima el ambiente y contagia entusiasmo a los demás. Se valora la energía que aporta al grupo, no cuánto bebe."),
  prize(1, 2, "El/la más pepa",
    "Reconoce a la persona más atractiva del grupo."),
  prize(2, 5, "El/la más borracho/a",
    "Reconoce a la persona que más veces terminó pasada de copas este año y dejó las mejores anécdotas."),
  prize(3, 6, "El/la más sano/a",
    "Reconoce a la persona más inocente del grupo: no capta las indirectas ni los dobles sentidos, se cree todo lo que le dicen y conserva una ingenuidad que nadie más tiene."),
  prize(4, 9, "El/la frío/a de fríos",
    "Reconoce a la persona que se pasa de fría: no tiene pelos en la lengua, dice lo que piensa sin miedo y sin medir el momento, y suelta comentarios que dejan a todos callados."),
  prize(5, 10, "El/la más migajero/a",
    "Reconoce a la persona que en el amor se conforma con muy poco: acepta la atención mínima de quien no la valora, se arrastra un poco más y siempre vuelve a intentarlo. Una auténtica paloma migajera."),
  prize(6, 13, "El mejor shipeo",
    "Elige a las dos personas que el grupo más quisiera ver juntas, sean o no pareja actualmente; vale cualquier combinación, también un shipeo gay. Se valora la química que todos perciben entre ellas, no solo tu preferencia personal.",
    { nomineeKind: "PAIR", maxPicks: 1 }),
  prize(7, 14, "El mejor dúo",
    "Elige a las dos personas que forman la mejor dupla de amigos del grupo: siempre andan juntas, se entienden sin hablar y rinden más en equipo. Aquí cuenta la complicidad como amigos, no el romance.",
    { nomineeKind: "PAIR", maxPicks: 1 }),
  prize(8, 17, "El showman",
    "Reconoce a la persona que nació para el escenario: tiene carisma, se roba la atención, hace reír, anima a todos y convierte cualquier momento en su propio show."),
  prize(9, 18, "Evento del año",
    "Elige el momento compartido más memorable del año.",
    { nomineeKind: "DIRECT", maxPicks: 1, minPicks: 0 }),
  prize(10, 21, "Revelación del año",
    "Reconoce a la persona que no era parte de los de siempre y que en los últimos meses se integró al grupo para bien."),
  prize(11, 22, "El/la amigo/a de todos",
    "Reconoce a quien es literalmente amigo/a de todos: conversa con cada uno de los subgrupos, siempre está presente, no se lleva mal con nadie y además es un buen amigo/a."),
  prize(12, 25, "EOTY · Engineer of the Year",
    "Reconoce a quien consideras el mejor ingeniero o ingeniera de nosotros, por sus habilidades y su manera de trabajar, tanto individualmente como en equipo. ¿Quién se merece este trofeo?"),

  // Honoríficas (12): normales, «más propenso/a a…», texto libre y la pregunta
  honor(0, 3, "Chill de cojones",
    "La persona más tranquila del grupo y la que menos se preocupa por las cosas."),
  prone(1, 4, "perderlo todo en las apuestas",
    "¿Quién tiene más probabilidades de arriesgarlo todo en una apuesta? Ya sea en el casino, en apuestas deportivas o en cualquier reto, apostaría incluso lo que no tiene."),
  honor(2, 7, "El lanzador de factos",
    "Reconoce a la persona que dice las verdades que otros callan: habla sin rodeos, pero con fundamento y en el momento preciso."),
  prone(3, 8, "caer en cana",
    "¿Quién tiene más probabilidades de terminar en cana por alguna ocurrencia o locura del momento?"),
  honor(4, 11, "La mejor frase",
    "La frase más memorable que dijo alguien del grupo este año. Escríbela tal como la recuerdas.",
    { nomineeKind: "TEXT", maxPicks: 2, minPicks: 1, finalistCount: 3 }),
  prone(5, 12, "regresar con su ex",
    "¿Quién tiene más probabilidades de volver con su ex, aunque asegure que ya lo superó?"),
  honor(6, 15, "El/la mejor compañero/a de trabajo grupal",
    "Reconoce a la persona con quien siempre querrías hacer un trabajo en grupo: cumple con su parte, aporta ideas, avisa a tiempo y está presente hasta la entrega."),
  prone(7, 16, "volverse gay",
    "¿Quién tiene más probabilidades de sorprendernos algún día saliendo del clóset?"),
  honor(8, 19, "Mejor profe",
    "El docente que más nos marcó durante la carrera, por su forma de enseñar, su trato o porque nos ayudó cuando más lo necesitábamos. Escribe el nombre de uno o dos profesores.",
    { nomineeKind: "TEXT", maxPicks: 2, minPicks: 1 }),
  prone(9, 20, "terminar enseñando en la universidad",
    "¿Quién tiene más probabilidades de terminar dictando clases en la universidad? Disfruta explicando, tiene paciencia y ya parece profesor/a."),
  honor(10, 23, "El/la más infravalorado/a",
    "Reconoce a la persona que suele pasar desapercibida pero aporta muchísimo: cumple en los trabajos, ayuda sin esperar nada a cambio y merece más reconocimiento del que recibe."),
  honor(11, 24, "¿Con quién dejarías a tu hijo/a?",
    "La persona en quien más confías: responsable, cariñosa y capaz de cuidar lo que más quieres como si fuera suyo.",
    { framing: "QUESTION" }),
];
