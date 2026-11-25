# NominacionesDP — Sistema de premiaciones del grupo

Aplicación web para organizar las premiaciones de un grupo grande de amigos (≈30–40 personas, puede variar): **nominaciones anónimas → selección de finalistas → votación anónima → revelación animada de ganadores en la reunión**.

El requisito central es la **confianza**: nadie (ni el organizador/admin) puede saber qué nominó o votó cada persona, ni quién va ganando antes de la ceremonia. Toda decisión técnica debe respetar esto (ver "Reglas de anonimato — NO NEGOCIABLES").

---

## 1. Stack

- **Next.js (App Router) + TypeScript** — frontend y API (Route Handlers / Server Actions)
- **Prisma + PostgreSQL en Neon** (capa gratuita)
- **Tailwind CSS** para estilos, con tokens del design system (sección 9)
- **Framer Motion** (animaciones). El confeti y la revelación son CSS puro (`components/ceremony/reveal.css`). Sin sonido en la ceremonia (decisión del usuario, 2026-11-14: molestaba)
- **libsodium-wrappers** — cifrado `crypto_box_seal` (sealed box) en el navegador
- **zod** — validación de entradas
- Deploy en **Vercel**; repositorio **público en GitHub** (transparencia: el grupo puede auditar el código)
- Costo objetivo: **$0**

Convenciones: identificadores de código en inglés, **todo el texto de la UI en español**. Mobile-first para votantes, pero Nominar, Votar y la página de Nominados también necesitan vista de escritorio (PC); la pantalla de ceremonia es 16:9 para proyector.

---

## 2. Roles

| Rol | Qué hace | Cómo se autentica |
|---|---|---|
| **Participante** | Entra a la sala tocando su nombre en la lista de invitados, nomina y vota | Sin contraseña ni PIN: elige su nombre y confirma (cookie de sesión firmada) |
| **Admin** (organizador) | Crea categorías, carga la lista de invitados, controla fases, resetea un envío hecho con el nombre de otro, elige categorías finales, conduce la ceremonia | Contraseña en variable de entorno `ADMIN_PASSWORD` + cookie firmada |
| **Notario** | Genera y custodia las llaves privadas; las ingresa para abrir nominaciones y votos. Puede ser el mismo organizador (decisión del 2026-11-12, ver §13) | No tiene cuenta: usa un link de configuración de un solo uso y luego solo ingresa su llave |

---

## 3. Flujo del evento (máquina de estados de `Event.phase`)

```
SETUP → NOMINATIONS → NOMINATIONS_CLOSED → FINALISTS_READY → VOTING → VOTING_CLOSED → CEREMONY → FINISHED
```

1. **SETUP** — El admin crea el evento, las categorías (tipo `PRIZE` o `HONORARY`), carga la **lista de invitados** y genera el link de configuración para el notario. El notario genera **dos pares de llaves** (uno para nominaciones, otro para votación) en su navegador; las públicas se guardan en el evento, las privadas las descarga y guarda él (con respaldo).
2. **NOMINATIONS** — Se comparte UN solo link/QR: la raíz del sitio (`/`), por WhatsApp. Mientras están abiertas, la raíz solo muestra la entrada y la papeleta de nominar (no hay pestaña de Nominados). Cada persona toca su nombre en la lista de invitados y entra (sin PIN ni aprobación). En cada categoría pone lo que esa categoría pide (ver «Tipos de categoría» en §6): **de 1 a 3** nombres, **1 pareja** en las de parejas, o texto libre (La mejor frase y Mejor profe: 1 o 2). Todas son obligatorias (decisión del usuario, 2026-11-22). Evento del año no se nomina: el organizador pone los finalistas. El admin puede sumar o quitar invitados hasta el cierre de la votación.
3. **NOMINATIONS_CLOSED** — Las nominaciones cierran a la hora programada (`nominationsCloseAt`, se aplica al leer el evento) o con el botón de fases. El notario ingresa su llave privada de nominaciones en `/admin/cierre-nominaciones`. Todo se descifra y cuenta **en el navegador**; se muestra una pantalla para unificar nombres duplicados (lista alfabética **sin conteos**). En las de **texto libre** el organizador ve todos los textos (alfabéticos, sin conteos ni autor), junta las variantes que son lo mismo («ing. ramirez» → «Ing. Ramírez») y corrige cómo se verá cada grupo; una papeleta que escribió dos variantes cuenta una vez (`countMerged`). Luego el sistema calcula el top N por categoría, también en texto libre. **Tope duro de 5 finalistas** (`MAX_FINALISTS`, decisión del usuario, 2026-11-25): si el empate del último puesto se pasa de N, el organizador decide en esa categoría (`splitAtCut`): que entren todos los empatados (solo si no pasan de 5), elegir cuáles entran o quedarse con los de arriba; ve quiénes entran fijos y quiénes están empatados en el corte, nunca conteos. Las de **finalistas directos** pasan con las opciones que cargó (máximo 5). Al servidor van **solo los finalistas**. Los conteos nunca se muestran ni se guardan.
4. **FINALISTS_READY** — El admin ve los finalistas (orden aleatorio, sin conteos) y elige qué categorías pasan a la votación: **máximo 15 de tipo `PRIZE`** (configurable) y las `HONORARY` que quiera. Define el orden de revelación (por defecto: honoríficas primero, de premio al final).
5. **VOTING** — Abre en horario programado (un día antes de la reunión). Un voto por categoría activa, una sola vez por participante. Cifrado en el celular.
6. **VOTING_CLOSED** — Cierre por horario. El admin solo ve participación (✔/⏳).
7. **CEREMONY** — Pantalla de presentador `/ceremonia`. El notario ingresa la llave privada de votación; los votos se descifran y cuentan en el navegador. Primero se proyecta cuántas personas votaron; luego se revela categoría por categoría.
8. **FINISHED** — Opcional: se guardan solo los ganadores para una página de recuerdo.

---

## 4. Reglas de anonimato — NO NEGOCIABLES

Claude Code debe verificar estas reglas en cada cambio que toque nominaciones, votos o participantes:

1. **Cifrado en el cliente.** Toda papeleta (nominación o voto) se cifra en el navegador con `crypto_box_seal` usando la llave pública de la fase correspondiente ANTES de enviarse. El servidor nunca recibe contenido en texto plano.
2. **Sobres con nombre solo mientras la urna está abierta.** Mientras su fase está abierta (`NOMINATIONS` o `VOTING`), cada `Ballot` guarda `participantId` (el «nombre por fuera del sobre») para que el admin pueda botar el sobre de una persona sin abrirlo si alguien votó en su nombre. **En la misma transacción que cierra la fase**, `participantId` pasa a `null` (`movePhase` y `unlinkClosedUrns` en `lib/event/transition.ts`, usados por el botón de fases, el horario y el cierre de nominaciones); antes de entregar papeletas para abrirlas se vuelve a limpiar por seguridad. Nunca hay relación Prisma con `Participant`, ni `createdAt`/`updatedAt`, IP o user-agent. El ID es UUID v4 aleatorio. Costo aceptado por el usuario (2026-11-12): mientras la urna está abierta, quien tenga la base y la llave del notario podría unir nombres y votos; el historial de Neon puede guardar el vínculo unas horas después de borrarlo.
3. **Sin marcas de tiempo delatoras.** `Participant` NO tiene `@updatedAt` ni campos de fecha sobre nominar/votar (solo booleanos `hasNominated` / `hasVoted`). `createdAt` (cuándo se agregó a la lista) sí está permitido.
4. **Envío atómico.** El envío de una papeleta es UNA transacción (`prisma.$transaction`): verificar que la fase siga abierta y que el participante no haya enviado → marcar booleano → insertar `Ballot` (con su `participantId`, regla 2). Si dos dispositivos envían a la vez, solo uno pasa (usar `updateMany` con condición `hasVoted: false` y verificar `count === 1`).
5. **Padding de tamaño.** Antes de cifrar, rellenar el JSON a un tamaño fijo para que el largo del texto cifrado no delate nada. Nominaciones: el peor caso según cómo se nomina en cada categoría (cupos × tipo: persona, pareja, opción o «de fuera»), en múltiplos de 1 KB e igual para todo el evento (`nominationBallotBytes` en `lib/ballots/nomination.ts`); votos: 1 KB hasta unas 11 categorías activas y de a 1 KB más si hay más (`voteBallotBytes` en `lib/ballots/vote.ts`). El servidor rechaza textos cifrados que no midan exactamente eso.
6. **Nunca registrar contenido.** No hacer `console.log` de papeletas, payloads descifrados ni conteos. Nada de analytics con eventos de voto.
7. **Descifrado solo en el navegador del notario/ceremonia.** Las llaves privadas nunca se envían al servidor ni se guardan en `localStorage`. Viven solo en memoria durante la sesión.
8. **Sin conteos visibles antes de tiempo.** Ninguna pantalla de admin muestra conteos de nominaciones ni de votos. Única excepción aceptada (2026-11-25): en el cierre, si un empate en el corte pasa de N, el organizador ve quiénes entran fijos y quiénes empatan en el último puesto, sin números. En la ceremonia se muestra el ganador (opcional: % redondeado del ganador) y, desde el 2026-11-14 (decisión del usuario), **los puestos 2.º, 3.º y 4.º sin conteos**: empates comparten puesto (el siguiente salta, p. ej. 2.º, 2.º, 4.º) y quien tuvo 0 votos no recibe puesto (aparece solo como «Finalista»). Nunca mostrar conteos exactos ni marcar a nadie con 0 votos. Los puestos se calculan en memoria en la ceremonia y no se guardan.
9. **Lecturas sin orden de inserción.** Al leer papeletas, ordenar por `id` (UUID aleatorio) o barajar; nunca depender del orden físico.
10. **El admin solo ve:** la lista de invitados, participación ✔/⏳ (los que ya enviaron en la urna abierta aparecen «bloqueados» solo en su panel; en la sala todos los nombres se ven iguales), nombres únicos sin conteos al unificar, finalistas sin conteos, y ganadores (con los puestos 2.º–4.º) solo en la ceremonia.

---

## 5. Lista de invitados y acceso

- Link único compartido: la raíz del sitio (`/`; los links viejos `/s/CÓDIGO/...` redirigen). No hay ningún link visible al panel: se entra por `/admin` o tocando el logo 5 veces seguidas en 2 s (`components/room/AdminDoor.tsx`; decisión del usuario, 2026-11-14). El admin carga la **lista de invitados** en `/admin/participantes` (pega nombres, uno por línea, de preferencia nombre y apellido, con apodos entre paréntesis: «Gabriel Mendoza (Gabo)»; únicos sin distinguir mayúsculas/tildes; tope `Event.capacity`). Los apodos se editan por invitado; si se pega un nombre que ya está, solo se le suman los apodos nuevos. Puede sumar o quitar nombres hasta que cierra la votación. No se puede abrir la sala sin lista.
- Entrada **sin PIN** (decisión del usuario, 2026-11-12): tarjetas con los nombres a la vista + buscador que también encuentra apodos (busca «gabo» y aparece la tarjeta «Gabriel Mendoza» con «Gabo» debajo); se toca el nombre, se confirma «Sí, soy yo» y queda una cookie httpOnly firmada en ese dispositivo. Todas las tarjetas se ven iguales: nada dice quién ya entró o votó.
- Sin PIN, cualquiera puede tocar cualquier nombre. La defensa es el panel: el admin ve «bloqueado» a quien ya nominó/votó en la urna abierta y puede **resetear** su envío: el sobre se bota sin abrirlo, la persona vuelve a poder enviar y `sessionVersion` sube (se cierran las sesiones abiertas con ese nombre). Solo mientras la urna está abierta (regla 2).
- Quitar a alguien de la lista también bota su sobre de la urna abierta; los de urnas ya cerradas no se pueden identificar y siguen contando.
- Nadie puede nominarse ni votarse a sí mismo: el celular no lo ofrece como opción (en Votar su tarjeta sale como «Eres tú»). Se aplica antes de sellar, sin que el servidor vea el voto; alguien que edite el código de la página podría saltárselo.

---

## 6. Modelo de datos (Prisma — borrador inicial)

```prisma
enum EventPhase { SETUP NOMINATIONS NOMINATIONS_CLOSED FINALISTS_READY VOTING VOTING_CLOSED CEREMONY FINISHED }
enum CategoryType { PRIZE HONORARY }
enum BallotPhase { NOMINATION VOTE }

model Event {
  id                   String     @id @default(uuid())
  name                 String
  roomCode             String     @unique
  phase                EventPhase @default(SETUP)
  capacity             Int        @default(40)
  minNominations       Int        @default(3)
  maxNominations       Int        @default(5)
  finalistsPerCategory Int        @default(4)   // sin uso: ahora es Category.finalistCount
  maxPrizeCategories   Int        @default(15)
  nominationPublicKey  String?
  votePublicKey        String?
  notarySetupTokenHash String?
  nominationsCloseAt   DateTime?  // las nominaciones cierran solas a esa hora
  votingOpensAt        DateTime?
  votingClosesAt       DateTime?
  showWinnerPercent    Boolean    @default(false)
  participants         Participant[]
  categories           Category[]
  ballots              Ballot[]
  groupPhotos          GroupPhoto[]
}

model Participant {             // un nombre de la lista de invitados
  id             String   @id @default(uuid())
  eventId        String
  event          Event    @relation(fields: [eventId], references: [id])
  displayName    String
  normalizedName String
  aliases        String[] @default([])  // apodos; el 1.º es el que se ve
  searchNames    String[] @default([])  // otros nombres solo para buscar (2.º nombre, apellidos); nunca se muestran
  photoUrl       String?                // foto del invitado; se usa en todas las pantallas
  hasNominated   Boolean  @default(false)
  hasVoted       Boolean  @default(false)
  sessionVersion Int      @default(0)  // sube al resetear su envío
  createdAt      DateTime @default(now())
  // SIN @updatedAt (regla de anonimato 3)
  @@unique([eventId, normalizedName])
}

model Category {
  id            String       @id @default(uuid())
  eventId       String
  event         Event        @relation(fields: [eventId], references: [id])
  name          String
  description   String       // la consigna
  type          CategoryType
  revealOrder   Int          @default(0)
  activeForVote Boolean      @default(false)
  revealed      Boolean      @default(false)
  framing       CategoryFraming @default(NORMAL)  // NORMAL | PRONE («Más propenso/a a…») | QUESTION
  nomineeKind   NomineeKind     @default(PERSON)  // PERSON | PAIR | OPTION | TEXT | DIRECT
  maxPicks      Int             @default(1)       // cuántos pone cada persona al nominar
  minPicks      Int             @default(0)       // mínimo obligatorio (0 = se puede dejar vacía)
  finalistCount Int             @default(4)       // 3, 4 o 5; siempre gana uno
  allowExternal Boolean         @default(false)   // «Otro (fuera del grupo)», solo PERSON
  options       CategoryOption[]                  // profes, eventos, frases (solo OPTION)
  finalists     Finalist[]
}

model Finalist {
  id            String   @id @default(uuid())
  categoryId    String
  category      Category @relation(fields: [categoryId], references: [id])
  displayName   String
  participantId String?  // si es del grupo; null si es referente externo
  partnerParticipantId String?  // la otra mitad, en categorías de parejas
  optionId      String?  // si es una opción del organizador
  photoUrl      String?  // si no tiene, se usa la del invitado
  blurb         String?
}

model CategoryOption {          // opciones que carga el organizador (profes, eventos, frases)
  id         String   @id @default(uuid())
  categoryId String
  label      String
  photoUrl   String?
  blurb      String?  // detalle: curso del profe, quién dijo la frase
  sortOrder  Int      @default(0)
}

model GroupPhoto {              // fotos grupales de la entrada de Nominados (recuerdos, no tocan votos)
  id       String @id @default(uuid())
  eventId  String
  event    Event  @relation(fields: [eventId], references: [id])
  slot     Int    // 0, 1 o 2
  photoUrl String // JPEG data URL (máx. ~1600 px)
  caption  String @default("")
  @@unique([eventId, slot])
}

model Ballot {
  id          String      @id @default(uuid())
  eventId     String
  event       Event       @relation(fields: [eventId], references: [id])
  phase       BallotPhase
  ciphertext    String      // base64 de crypto_box_seal
  participantId String?     // solo mientras la urna está abierta; null al cerrar (regla 2)
  // SIN createdAt (regla de anonimato 2)
}
```

### Tipos de categoría (decisión del usuario, 2026-11-21)

- **Título** (`framing`): normal («El alma de la fiesta»), **«Más propenso/a a…»** (se guarda solo el final, «volverse gay», y el rótulo va arriba) o **pregunta** («¿Con quién dejarías a tu hijo/a?»). `categoryTitle` en `lib/event/categoryKinds.ts` arma el título completo.
- **Qué se nomina** (`nomineeKind`): una **persona** de la lista; una **pareja** (dos invitados, el orden no importa; shipeo, dúo); **opciones** que carga el organizador (tarjetas con foto al nominar); **texto libre** (La mejor frase, Mejor profe: cada uno escribe lo que quiera, hasta 140 caracteres, y al cierre el organizador elige los finalistas entre todos los textos, sin conteos ni autor); o **finalistas directos** (Evento del año: no aparece al nominar; el organizador carga las opciones con foto y pasan tal cual a votar). (Decisiones del usuario, 2026-11-22.)
- **Criterio:** la consigna (`description`, hasta 400 caracteres) dice qué cuenta para elegir y qué no («No es tu mejor amigo/a: es el de todos»); se ve al nominar, en Nominados, al votar y en la ceremonia.
- **Cuántos pone cada uno** (`maxPicks`: 3 en las de persona, 1 pareja, frase y profe hasta 2) y si es **obligatoria** (`minPicks`: 1 en todas las que se nominan, decisión del usuario, 2026-11-22) y **finalistas** (`finalistCount`: 3, 4 o 5; con empates nunca más de 5). **Siempre gana uno.** «Otro (fuera del grupo)» está apagado salvo que se active por categoría.
- **Orden:** Nominados, Nominar y Votar muestran primero las de premio y luego las honoríficas (`sortByType`), cada grupo por `sortOrder`; la ceremonia usa `revealOrder`. Las 25 categorías de Premios del Grupo (`lib/event/presetCategories.ts`) se cargan con un botón en `/admin/categorias` y traen ambos órdenes: la ceremonia va «2 premios → 1 honorífica → 1 más propenso», cierre emotivo y EOTY al final.
- **Fotos:** cada invitado puede tener foto (se sube cuando se quiera en `/admin/participantes`); los finalistas la usan si no tienen una propia. Las parejas se ven con la foto partida al medio.
- **Buscador de Nominar y de la entrada:** encuentra por nombre, apodo, segundo nombre o apellido y muestra lo que coincidió; al elegir se ve solo nombre y apellido. Formato al pegar la lista: `Gabriel Mendoza (Gabo, el admin) [Gabriel Armando Mendoza Salcedo]`: paréntesis = apodos (el 1.º se ve), corchetes = otros nombres solo para buscar (las palabras que ya están en el nombre se omiten).

### Formato de papeletas (antes de cifrar)

```ts
// Nominación
{ v: 1, kind: "nomination",
  categories: { [categoryId]: Array<
    | { type: "participant"; id: string }
    | { type: "external"; name: string }
    | { type: "pair"; ids: [string, string] }   // ordenados: A+B = B+A
    | { type: "option"; id: string }            // opción del organizador
    | { type: "text"; text: string }            // texto libre (frase, profe), hasta 140 caracteres
  > },
  pad: "..." }

// Voto
{ v: 1, kind: "vote",
  votes: { [categoryId]: finalistId | null },  // null = abstención (si se permite)
  pad: "..." }
```

Sin comprobantes: se quitaron el 2026-11-12 (con la lista de invitados y el reset del admin no aportaban).

---

## 7. Rutas y pantallas

### Participante (mobile-first, con vista de PC)
| Ruta | Pantalla |
|---|---|
| `/` | La sala (decisión del usuario, 2026-11-14: todo en la raíz). Según la fase (`homeView` en `lib/event/nominees.ts`): SETUP o sin evento → «la sala todavía no abre», con enlaces a «Probar la demo» y «Ver el diseño» (`/diseno.html`); NOMINATIONS → entrada con la lista de invitados y luego a `/nominar` (quien ya nominó ve «¡Listo!» con la cuenta regresiva al cierre); desde NOMINATIONS_CLOSED → **Nominados**, la vista que queda el resto del evento. La ceremonia nunca aparece aquí |
| `/entrar?ir=nominar\|votar` | Tarjetas con los nombres de la lista de invitados + buscador; se toca el nombre, se confirma «Sí, soy yo» (sin PIN) y sigue a nominar o votar |
| `/nominar` | Una tarjeta por categoría con su consigna; autocompletado con la lista de invitados (menos uno mismo) + opción "Otro (referente externo)" con texto libre; barra de progreso; revisión final y envío único |
| Nominados (en `/`) | Siempre de noche (`components/nominees/NomineesShow.tsx`): entrada con las fotos grupales y un capítulo por categoría con foto o iniciales, nombre y apodo, en orden alfabético y **sin conteos** (regla 8) (ver §9). Botón **Votar** (`voteButton`): visible pero apagado hasta que abre la votación (con cuenta regresiva), activo mientras está abierta (`votingOpensAt`–`votingClosesAt`, lo fija el admin), «✔ Ya votaste» y «Votación cerrada» después. Va arriba en la entrada y, mientras la votación está abierta, también en cada capítulo (en el celular al lado del número grande; en PC bajo la consigna y la raya de avance, pegado al bajar); no hay botón al final de la página (decisión del usuario, 2026-11-19). Para recorrer ~20 categorías (`components/nominees/CategoryNav.tsx`, lienzo R21 · «Hilo»): una línea fina pegada arriba con la categoría actual, raya de avance y «de N», que abre la lista completa (filtro Premio/Honoríficas, iniciales de los nominados, «Estás aquí»); en PC, además, un riel de rayitas en el borde derecho que muestra el nombre al pasar el mouse. Si hay otra franja pegada arriba (`data-sticky-top`, el demo), el hilo va debajo. Antes de que existan finalistas: cartas boca abajo. Pública (sin enviar finalistas al navegador mientras estén boca abajo); con sesión se muestra la franja de participación. Una categoría se publica al activarla en `/admin/finalistas`. `/nominados` redirige a `/` |
| `/votar` | Una categoría por pantalla, tarjetas de finalistas (la propia sale como «Eres tú» y no se puede elegir), resumen final y confirmación. Al enviar: «¡Listo! Tu voto quedó guardado en secreto» |
| `/transparencia` | "¿Quién puede ver mi voto? Nadie." Explicación del cifrado, la llave del notario, los sobres que pierden el nombre al cerrar y link al repo público |

### Demo y diseño (públicas)
| Ruta | Pantalla |
|---|---|
| `/demo` | Demo para probar sin evento (la sala solo lo enlaza mientras no hay evento abierto), **solo el flujo del participante** (decisión del usuario, 2026-11-13: la ceremonia y el panel son del organizador y no se muestran): portada y cinco pasos (`/demo/entrar`, `/demo/nominar`, `/demo/nominados`, `/demo/votar` y `/demo/ganador`, rotulado «Ceremonia (ejemplo)»: muestra la pantalla del ganador de cada categoría con ganadores de ejemplo y aclara que quien vota no ve la ceremonia —en el evento real solo el admin la abre a cierta hora y la proyecta (decisión del usuario, 2026-11-14)—, usando las mismas piezas de la gala en `components/ceremony/Stage.tsx`) con un grupo ficticio (`src/lib/demo/fixtures.ts`). Usa los componentes reales con props opcionales (`onSubmit`, `doneLink`, `autofill`: botón «Rellenar automáticamente» que llena la papeleta al azar y salta a la revisión, solo en el demo); cifra con llaves de juguete en memoria y no toca la base ni las server actions |
| `/diseno.html` | Archivo autónomo (`public/diseno.html`) que presenta el sistema «Día y noche». Copia los valores de `globals.css`: actualizarlo si el diseño cambia |

### Notario
| Ruta | Pantalla |
|---|---|
| `/notario/[setupToken]` | Link de un solo uso: genera en el navegador los dos pares de llaves, sube SOLO las públicas, obliga a descargar el archivo de llaves privadas (y sugiere guardar respaldo) antes de confirmar |

### Admin
| Ruta | Pantalla |
|---|---|
| `/admin` | Login con contraseña |
| `/admin/evento` | Datos del evento, fase actual con botones para avanzar (con confirmación), horarios de votación, link/QR de la sala para copiar, fotos grupales de la entrada de Nominados (hasta 3, con pie de foto) |
| `/admin/categorias` | CRUD de categorías, tipo PRIZE/HONORARY, consigna, orden arrastrable |
| `/admin/participantes` | Lista de invitados: agregar (pegar nombres) y quitar, participación ✔/⏳, «bloqueado» para quien ya envió en la urna abierta y botón «Resetear nominación/voto» |
| `/admin/cierre-nominaciones` | El notario carga su llave → descifrado y conteo en memoria → unificación de nombres (sin conteos) → cálculo automático de finalistas → envío solo de finalistas |
| `/admin/finalistas` | Finalistas por categoría (orden aleatorio, sin conteos), subir foto/frase opcional, activar categorías para votar (máx. 15 PRIZE), orden de revelación |

### Ceremonia (proyector 16:9)
| Ruta | Pantalla |
|---|---|
| `/ceremonia` | Requiere sesión admin + llave privada de votación del notario. Portada → cuántos votaron → categorías una por una. Control con teclado (Espacio/→ siguiente, ← atrás, F pantalla completa), cursor oculto |

---

## 8. Secuencia de revelación (por categoría)

Diseño del lienzo «Ronda 8 · A2» (`components/ceremony/Reveal.tsx`, la misma escena en `/ceremonia` y en el demo). Dos pasos por categoría, que el presentador avanza con Espacio/→:

1. **Nominados:** chip «Categoría NN · Premio/Honorífica», título (la segunda mitad en cursiva), consigna y número gigante con contorno; los finalistas suben uno por uno con nombre y apodo
2. **Suspenso** (al avanzar): las tarjetas se apagan, viñeta, un foco las recorre y se detiene sobre el ganador, «Y el premio es para…» y el número se llena de color (sin sonido)
3. **Destello:** las demás tarjetas caen y la foto ganadora vuela a la izquierda, inclinada
4. **Fiesta («C de fiesta»):** banderines arriba, confeti que cae por detrás de los textos y se queda en el piso; al centro «Primer puesto · categoría», «¡Felicidades, {apodo}!» y el nombre gigante; a la derecha el trofeo (copa para PRIZE, laurel para HONORARY); globo «¡que hable!» sobre la foto
5. Opcional: % del ganador redondeado (`showWinnerPercent`)
6. **Empates:** dos fotos superpuestas, «Empate · categoría» y los nombres unidos con «y»
7. **Le siguen:** puestos 2.º–4.º del resto de finalistas, sin conteos (regla 8); sin puesto si tuvo 0 votos
8. Sin votos: «Categoría desierta»

Los resultados se calculan en memoria al cargar la llave; no se persisten hasta FINISHED (y solo los ganadores).

---

## 9. Design system — "Día y noche"

Una sola identidad con dos momentos: **de día** (la web: Nominar, Nominados, Votar) y **de noche** (la premiación en el proyector). La noche usa los mismos colores del día con los papeles cambiados: la tinta pasa a ser el fondo y la hoja pasa a ser la luz. Referencia visual: lienzo de diseño del organizador, página «Ronda 5 · Día y noche».

> **Estado del código:** migrado. Los tokens viven en `src/app/globals.css` (`bg-bg`, `bg-sheet`, `text-ink`, `text-ink-soft`, `bg-copper`, `bg-sage`…); `.theme-night` cambia los papeles para los pedacitos de noche y la ceremonia; `chamfer-N` / `chamfer-tl-N` (o `chamfer-[1.5cqw]`) da el chaflán; `.accent-prize` / `.accent-honor` fijan `--accent` para duotono, cartas boca abajo y etiquetas. Usar siempre los primitivos (`Button`/`buttonClasses`, `Card`, `Chip`, `Field`, `Countdown`, piezas de `components/ballot/BallotParts`) y los tokens, nunca colores sueltos en las páginas. Nombres históricos: `--copper` es el **acento de premio** y `--sage` el **de honorífica** (ya no son cobre ni salvia).

### Dos temas: claro y oscuro (decisión del usuario, 2026-11-14)

Cada persona elige con el botón `ThemeToggle` (en la entrada de la sala, las papeletas, el demo y el panel; Nominados es siempre de noche). **Nominados y la ceremonia usan siempre la paleta clara «Oro y carmín»** (oro premio, carmín honorífica) aunque la persona tenga el tema oscuro: clase `.palette-claro` en `globals.css` (decisión del usuario, 2026-11-19). La elección se guarda solo en su dispositivo (`localStorage` «tema»); si nunca eligió, manda su sistema. Un script en `layout.tsx` pone `data-theme` en `<html>` antes de pintar. La ceremonia siempre es de noche.

| Token | Claro · «Oro y carmín» | Oscuro · «Gala nocturna» | Uso |
|---|---|---|---|
| `--bg` | `#F3EEE3` | `#0E0B0C` | Fondo de la web |
| `--sheet` | `#FCF9F2` | `#1A1516` | Hoja: papeletas, fichas, paneles |
| `--raised` | `#FFFFFF` | `#231C1D` | Fila elegida, tarjetas, sugerencias |
| `--sand` | `#EAE1CF` | `#2C2425` | Fondo de iniciales sin foto |
| `--line` / `--line-strong` | `#E4DAC6` / `#AD9F86` | `#2C2425` / `#4A3E3F` | Bordes y separadores |
| `--ink` / `--ink-soft` | `#14100B` / `#5C5446` | `#F6EFE6` / `#CBBFB5` | Texto principal / secundario |
| `--copper` (premio) | `#E3B14E` oro | `#C23B44` carmín | Acento PRIZE, botón primario |
| `--copper-duo` | `#D9A94D` | `#B9474E` | Duotono de fotos PRIZE |
| `--sage` (honorífica) | `#C23B44` carmín | `#D9AE4F` oro | Acento HONORARY |
| `--sage-duo` | `#B9474E` | `#DCB867` | Duotono de fotos HONORARY |
| `--on-copper` / `--on-sage` | `#14100B` / `#FFF6EE` | `#FFF6EE` / `#14100B` | Texto sobre los rellenos de acento (AA) |
| `--kraft` | `#C9A57B` | `#C9A57B` | Sobre de la pantalla «Voto sellado» |

Noche (`.theme-night`): en el tema claro `--bg #0A0A0A`, `--sheet #161513`, `--ink #F6F0E4`; en el oscuro `--bg #070606`, `--sheet #141011`, `--ink #F6EFE6`. Estados: éxito `#2F6B3A` / error `#A8231C` en claro; `#8FD19E` / `#F2A199` en oscuro y de noche.

### Reglas

- **Los acentos no cambian de tono dentro de un tema:** el de premio y el de honorífica son idénticos de día y de noche en ese tema (no usar versiones "profundas" para que se lean sobre claro).
- **Sobre fondos claros, los acentos nunca son texto pequeño:** van de relleno (sello de tipo de categoría, etiqueta «Nº», «Tu voto», casilla marcada, botón primario, sello de cera). El texto encima usa `--on-copper` / `--on-sage` (lo aplica solo `globals.css` a `bg-copper`, `bg-sage` y `bg-(--accent)`): oscuro sobre oro, claro sobre carmín. Sobre la noche sí pueden ser texto.
- **Pedacitos de noche en la web:** la cuenta regresiva y las cartas boca abajo de Nominados van sobre `--ink`, con cifras y detalles en el acento de premio.
- **Tipografía:** solo **Unbounded** (600/700/800: títulos, números, etiquetas, botones) y **Schibsted Grotesk** (400/600/700 e itálica: texto, nombres, frase del nominado), vía `next/font`.
- **Forma:** esquina cortada en diagonal (chaflán) en tarjetas, botones, etiquetas y fotos: `clip-path: polygon(N 0, 100% 0, 100% calc(100% - N), calc(100% - N) 100%, 0 100%, 0 N)`. Para un borde fino con chaflán, envolver en un contenedor con el color del borde y 1px de padding.
- **Fotos:** siempre en duotono (acento de premio para PRIZE, de honorífica para HONORARY) para igualar fotos de distinta calidad; sin foto, iniciales en `--ink` sobre `--sand`.
- **Logo:** la **estatuilla de Premios del Grupo** (decisión del usuario, 2026-11-15; lienzo, ronda 19 · B01): figura sin rostro, brazos cruzados en X con los puños sobre los brazos y pedestal redondo, en el acento de premio + nombre del evento. Una sola tinta con calados entre los brazos (`components/ui/Statuette.tsx`, `LogoMark`); la usan la cabecera, las papeletas, la ceremonia, la carga y el favicon (`app/icon.svg`).
- **Trofeos de la ceremonia:** copa facetada para PRIZE y laurel con estrella para HONORARY (`components/ceremony/trophyShapes.ts`), en los tonos del acento.
- **Fondo:** haces de luz suaves en diagonal (de día, blanco translúcido; de noche, luz de `--sheet` muy tenue). Respetar `prefers-reduced-motion`.
- **Accesibilidad:** contraste AA (por eso la regla de los acentos), foco visible, botones de mín. 48px de alto, animaciones reducidas si el usuario lo pide.

### Componentes y pantallas

- **Botones:** primario cobre con texto tinta y chaflán; secundario transparente con borde de 1.5px en tinta. Filtro seleccionado: fondo tinta con texto `--sheet`.
- **Papeleta (Nominar / Votar):** hoja `--sheet` con filo `--line` sobre `--bg`, cabecera con doble regla (2px + 1px de tinta) y sello de tipo de categoría rotado. En Votar, fila completa tocable con foto, frase, «Tu voto» y casilla que se llena de cobre. En PC, la papeleta va al centro con el índice o el resumen a un costado.
- **Nominados = «Estreno con recuerdos»** (lienzo R8 · A2, siempre de noche): entrada con las 3 fotos grupales que sube el admin (`GroupPhoto`, en `/admin/evento`) en abanico; al bajar, cada una pasa a pantalla completa como diapositiva con una frase (animaciones atadas al scroll, `nominados/show.css`). Luego un capítulo por categoría: cinta con el nombre (fina y espaciada, en gris tenue con rombos del acento: lienzo R23 · E), número con contorno que se llena, índice, y tarjetas con foto, nombre y apodo (sin frases ni conteos). Antes de los finalistas: cartas boca abajo y cuenta regresiva.
- **¡Listo! (voto sellado):** sobre kraft con sello de cera cobre, «Tu voto quedó guardado en secreto» y por qué nadie lo ve. Sin comprobante.
- **Premiación (noche):** portada, asistencia y cierre sobre el escenario con reflectores y piso en perspectiva; cada categoría usa la escena de §8 (1280 × 720 escalada al proyector). Fondo con degradado de luz desde arriba (`.stage-gradient`), para que no sea tan oscuro; el confeti cae por los costados y queda en el piso, sin tapar el nombre ni «Le siguen».

---

## 10. Estructura de carpetas sugerida

```
src/
  app/
    (sala)/(page, entrar, nominar, votar)   # la sala vive en la raíz
    notario/[setupToken]/
    admin/(evento, categorias, participantes, cierre-nominaciones, finalistas)
    ceremonia/
    transparencia/
    api/...
  components/ui/          # Button, Card, Chip, Modal, ProgressBar...
  components/ceremony/    # RevealSequence, FinalistCard, Envelope, Spotlight
  lib/crypto/             # keys.ts, seal.ts, open.ts, padding.ts (solo cliente)
  lib/ballots/            # build, validate (zod), tally, mergeNames, pickFinalists
  lib/auth/               # sesión admin (la del participante vive en lib/participants)
  lib/db.ts               # cliente Prisma
prisma/schema.prisma
```

---

## 11. Plan de desarrollo por fases

Marcar cada ítem al completarlo. No avanzar de fase sin que la anterior funcione de punta a punta.

- [x] **Fase 0 — Base:** Next.js + TS + Tailwind, Prisma + Neon, design system (tokens, fuentes, `Button`, `Card`, `Chip`), layout con fondo de gala, deploy inicial en Vercel, `.env.example`
- [x] **Fase 1 — Admin y evento:** login admin, CRUD de evento y categorías, control de fases, link/QR de la sala
- [x] **Fase 2 — Notario y cripto:** `lib/crypto` (generación de llaves, seal, open, padding) con **tests unitarios**, página `/notario/[setupToken]`
- [x] **Fase 3 — Acceso:** entrada a la sala, sesión, participación ✔/⏳ (rehecha el 2026-11-12: lista de invitados sin PIN, sobres con nombre y reset del admin)
- [x] **Fase 4 — Nominaciones:** formulario por categoría con autocompletado, validación min/max, cifrado + envío atómico, pantalla de transparencia
- [x] **Fase 5 — Cierre y finalistas:** descifrado en navegador, unificación de nombres sin conteos, top N con empates, activación de categorías (máx. 15 PRIZE), orden de revelación, fotos/frases opcionales
- [x] **Fase 6 — Votación:** apertura/cierre por horario, flujo de voto, cifrado + envío atómico, tarjeta «Eres tú»
- [x] **Fase 7 — Ceremonia:** carga de llave, conteo en memoria, cuántos votaron, secuencia de revelación completa con confeti (rehecha el 2026-11-14 con el diseño R8 · A2 y la pantalla «C de fiesta»; sin sonido), controles de teclado, empates
- [ ] **Fase 8 — Pruebas y ensayo:** test de doble envío concurrente, test de que `Ballot` y `Participant` no tienen campos prohibidos, prueba con 5–10 amigos, ensayo en el proyector real

---

## 12. Tests obligatorios

- `seal` → `open` devuelve el mismo payload; con llave equivocada falla.
- Padding: dos papeletas distintas producen ciphertext del mismo tamaño.
- Envío concurrente de la misma papeleta desde dos sesiones: solo una se guarda.
- Resetear un envío bota el sobre (sin abrirlo) y deja volver a enviar; al cerrar la fase ningún sobre conserva `participantId` y ya no se puede resetear (`record.int.test.ts`).
- `tally` y `pickFinalists`: empates en el corte incluyen a todos; nombres unificados suman correctamente.
- Test de esquema: `Ballot` no tiene `createdAt`, `updatedAt` ni relación con `Participant`, y su `participantId` es opcional (`String?`); `Participant` no tiene `updatedAt`.

---

## 13. Decisiones pendientes (preguntar al usuario antes de asumir)

- ~~Nombre del evento y del grupo (identidad visual)~~ **Decidido (2026-11-15):** «Premios del Grupo», con la estatuilla de brazos cruzados como logo (§9).
- Fecha de la reunión (para programar fases)
- ~~¿Quién será el notario?~~ **Decidido (2026-11-12):** el mismo organizador.
- ~~¿Se permite omitir una categoría al nominar o votar (abstención)?~~ **Decidido:** al nominar se puede dejar una categoría vacía (configurable, `allowNominationSkip`). **Al votar no hay «Me abstengo»** (decisión del usuario, 2026-11-19): en cada categoría se vota por alguien; solo se salta una categoría si la persona era su único finalista. La columna `allowVoteAbstention` queda en la base sin uso. Nadie puede nominarse a sí mismo.
- ¿Mostrar el % del ganador o solo el nombre?
- ~~Número de finalistas por categoría~~ **Decidido (2026-11-21):** por categoría (3, 4 o 5; por defecto 4), siempre un ganador.
- ¿Fotos de los finalistas en la ceremonia?

---

## 14. Forma de trabajo para Claude Code

- Trabajar fase por fase; al terminar una, resumir qué se hizo y qué sigue.
- Antes de tocar cualquier cosa relacionada con papeletas, releer la sección 4.
- Preferir componentes simples y legibles; nada de dependencias innecesarias.
- Mantener `.env.example` actualizado (`DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`).
- Si una decisión de la sección 13 bloquea el trabajo, preguntar en vez de asumir.
