# NominacionesDP — Sistema de premiaciones del grupo

Aplicación web para organizar las premiaciones de un grupo grande de amigos (≈30–40 personas, puede variar): **nominaciones anónimas → selección de finalistas → votación anónima → revelación animada de ganadores en la reunión**.

El requisito central es la **confianza**: nadie (ni el organizador/admin) puede saber qué nominó o votó cada persona, ni quién va ganando antes de la ceremonia. Toda decisión técnica debe respetar esto (ver "Reglas de anonimato — NO NEGOCIABLES").

---

## 1. Stack

- **Next.js (App Router) + TypeScript** — frontend y API (Route Handlers / Server Actions)
- **Prisma + PostgreSQL en Neon** (capa gratuita)
- **Tailwind CSS** para estilos, con tokens del design system (sección 9)
- **Framer Motion** (animaciones), **canvas-confetti** (confeti), **Howler.js** (sonidos de la ceremonia)
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
2. **NOMINATIONS** — Se comparte UN solo link/QR de la sala (`/s/[roomCode]`) por WhatsApp. Cada persona toca su nombre en la lista de invitados y entra (sin PIN ni aprobación). Nomina de 3 a 5 personas/referentes por categoría (configurable). El admin puede sumar o quitar invitados hasta el cierre de la votación.
3. **NOMINATIONS_CLOSED** — Las nominaciones cierran a la hora programada (`nominationsCloseAt`, se aplica al leer el evento) o con el botón de fases. El notario ingresa su llave privada de nominaciones en `/admin/cierre-nominaciones`. Todo se descifra y cuenta **en el navegador**; se muestra una pantalla para unificar nombres duplicados (lista alfabética **sin conteos**). Luego el sistema calcula automáticamente el top N por categoría (empates en el último puesto entran todos) y envía al servidor **solo los finalistas**. Los conteos nunca se muestran ni se guardan.
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
5. **Padding de tamaño.** Antes de cifrar, rellenar el JSON a un tamaño fijo para que el largo del texto cifrado no delate nada. Nominaciones: el peor caso según número de categorías × máximo de nominados, en múltiplos de 1 KB e igual para todo el evento (`nominationBallotBytes` en `lib/ballots/nomination.ts`); votos: 1 KB hasta unas 11 categorías activas y de a 1 KB más si hay más (`voteBallotBytes` en `lib/ballots/vote.ts`). El servidor rechaza textos cifrados que no midan exactamente eso.
6. **Nunca registrar contenido.** No hacer `console.log` de papeletas, payloads descifrados ni conteos. Nada de analytics con eventos de voto.
7. **Descifrado solo en el navegador del notario/ceremonia.** Las llaves privadas nunca se envían al servidor ni se guardan en `localStorage`. Viven solo en memoria durante la sesión.
8. **Sin conteos visibles antes de tiempo.** Ninguna pantalla de admin muestra conteos de nominaciones ni de votos. En la ceremonia se muestra solo el ganador (opcional: % redondeado del ganador). Nunca mostrar finalistas con 0 votos ni conteos exactos.
9. **Lecturas sin orden de inserción.** Al leer papeletas, ordenar por `id` (UUID aleatorio) o barajar; nunca depender del orden físico.
10. **El admin solo ve:** la lista de invitados, participación ✔/⏳ (los que ya enviaron en la urna abierta aparecen «bloqueados» solo en su panel; en la sala todos los nombres se ven iguales), nombres únicos sin conteos al unificar, finalistas sin conteos, y ganadores solo en la ceremonia.

---

## 5. Lista de invitados y acceso

- Link único compartido: `/s/[roomCode]`. El admin carga la **lista de invitados** en `/admin/participantes` (pega nombres, uno por línea; únicos sin distinguir mayúsculas/tildes; tope `Event.capacity`). Puede sumar o quitar nombres hasta que cierra la votación. No se puede abrir la sala sin lista.
- Entrada **sin PIN** (decisión del usuario, 2026-11-12): tarjetas con los nombres a la vista + buscador; se toca el nombre, se confirma «Sí, soy yo» y queda una cookie httpOnly firmada en ese dispositivo. Todas las tarjetas se ven iguales: nada dice quién ya entró o votó.
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
  finalistsPerCategory Int        @default(4)
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
}

model Participant {             // un nombre de la lista de invitados
  id             String   @id @default(uuid())
  eventId        String
  event          Event    @relation(fields: [eventId], references: [id])
  displayName    String
  normalizedName String
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
  finalists     Finalist[]
}

model Finalist {
  id            String   @id @default(uuid())
  categoryId    String
  category      Category @relation(fields: [categoryId], references: [id])
  displayName   String
  participantId String?  // si es del grupo; null si es referente externo
  photoUrl      String?
  blurb         String?
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

### Formato de papeletas (antes de cifrar)

```ts
// Nominación
{ v: 1, kind: "nomination",
  categories: { [categoryId]: Array<{ type: "participant"; id: string } | { type: "external"; name: string }> },
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
| `/s/[roomCode]` | Entrada a la sala: tarjetas con los nombres de la lista de invitados + buscador; se toca el nombre y se confirma «Sí, soy yo» (sin PIN) |
| `/s/[roomCode]/nominar` | Una tarjeta por categoría con su consigna; autocompletado con la lista de invitados (menos uno mismo) + opción "Otro (referente externo)" con texto libre; barra de progreso; revisión final y envío único |
| `/s/[roomCode]/nominados` | Página de nominados (vista por defecto de la sala, la más visitada; móvil y PC): finalistas por categoría con foto o iniciales, frase corta, en orden alfabético o aleatorio y **sin conteos** (regla 8), filtros Premio/Honoríficas y cuenta regresiva a la votación. Antes de que existan finalistas muestra un estado "en espera" (tarjetas boca abajo) con cuenta regresiva al cierre de nominaciones. Pública para quien tenga el link (sin enviar finalistas al navegador mientras estén boca abajo); con sesión, `/s/[roomCode]` redirige aquí y se muestra la franja de participación. Una categoría se publica al activarla en `/admin/finalistas` |
| `/s/[roomCode]/votar` | Una categoría por pantalla, tarjetas de finalistas (la propia sale como «Eres tú» y no se puede elegir), resumen final y confirmación. Al enviar: «¡Listo! Tu voto quedó guardado en secreto» |
| `/transparencia` | "¿Quién puede ver mi voto? Nadie." Explicación del cifrado, la llave del notario, los sobres que pierden el nombre al cerrar y link al repo público |

### Demo y diseño (públicas)
| Ruta | Pantalla |
|---|---|
| `/demo` | Demo para probar sin evento, **solo el flujo del participante** (decisión del usuario, 2026-11-13: la ceremonia y el panel son del organizador y no se muestran): portada y cinco pasos (`/demo/entrar`, `/demo/nominar`, `/demo/nominados`, `/demo/votar` y `/demo/ganador`, que muestra solo la pantalla del ganador de cada categoría con ganadores de ejemplo, usando las mismas piezas de la gala en `components/ceremony/Stage.tsx`) con un grupo ficticio (`src/lib/demo/fixtures.ts`). Usa los componentes reales con props opcionales (`onSubmit`, `doneLink`, `autofill`: botón «Rellenar automáticamente» que llena la papeleta al azar y salta a la revisión, solo en el demo); cifra con llaves de juguete en memoria y no toca la base ni las server actions |
| `/diseno.html` | Archivo autónomo (`public/diseno.html`) que presenta el sistema «Día y noche». Copia los valores de `globals.css`: actualizarlo si el diseño cambia |

### Notario
| Ruta | Pantalla |
|---|---|
| `/notario/[setupToken]` | Link de un solo uso: genera en el navegador los dos pares de llaves, sube SOLO las públicas, obliga a descargar el archivo de llaves privadas (y sugiere guardar respaldo) antes de confirmar |

### Admin
| Ruta | Pantalla |
|---|---|
| `/admin` | Login con contraseña |
| `/admin/evento` | Datos del evento, fase actual con botones para avanzar (con confirmación), horarios de votación, link/QR de la sala para copiar |
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

1. Título de la categoría entra con brillo (cobre si es PRIZE, salvia si es HONORARY) + consigna
2. Finalistas aparecen uno por uno en tarjetas
3. Suspenso: tarjetas se atenúan, un foco de luz las recorre, redoble de tambor (Howler)
4. Se abre un "sobre"; la tarjeta ganadora crece al centro con destello + confeti cobre (`canvas-confetti`) + sonido de fanfarria
5. Opcional: % del ganador redondeado (`showWinnerPercent`)
6. **Empates:** mostrar ganadores compartidos (por defecto)

Los resultados se calculan en memoria al cargar la llave; no se persisten hasta FINISHED (y solo los ganadores).

---

## 9. Design system — "Día y noche"

Una sola identidad con dos momentos: **de día** (la web: Nominar, Nominados, Votar) y **de noche** (la premiación en el proyector). La noche usa los mismos colores del día con los papeles cambiados: la tinta pasa a ser el fondo y la hoja pasa a ser la luz. Referencia visual: lienzo de diseño del organizador, página «Ronda 5 · Día y noche».

> **Estado del código:** migrado. Los tokens viven en `src/app/globals.css` (`bg-bg`, `bg-sheet`, `text-ink`, `text-ink-soft`, `bg-copper`, `bg-sage`…); `.theme-night` cambia los papeles para los pedacitos de noche y la ceremonia; `chamfer-N` / `chamfer-tl-N` (o `chamfer-[1.5cqw]`) da el chaflán; `.accent-prize` / `.accent-honor` fijan `--accent` para duotono, cartas boca abajo y etiquetas. Usar siempre los primitivos (`Button`/`buttonClasses`, `Card`, `Chip`, `Field`, `Countdown`, piezas de `components/ballot/BallotParts`) y los tokens, nunca colores sueltos en las páginas.

### Colores

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#E9E1D3` | Fondo de la web (día) |
| `--sheet` | `#F8F4EC` | Hoja: papeletas, fichas, paneles · texto principal de noche |
| `--raised` | `#FFFFFF` | Fila seleccionada, tarjetas de nominado, lista de sugerencias |
| `--sand` | `#E2D7C5` | Fondo de iniciales cuando no hay foto |
| `--line` | `#DDD2C0` | Bordes y separadores de día |
| `--ink` | `#141A19` | Texto principal de día · fondo de noche |
| `--ink-soft` | `#55605D` | Texto secundario de día |
| `--night-panel` | `#1D2523` | Paneles de noche |
| `--night-line` | `#2C3633` | Líneas de noche |
| `--night-text-2` | `#C9C2B6` | Texto secundario de noche |
| `--night-text-3` | `#93A39E` | Texto terciario de noche |
| `--copper` | `#D9783F` | Acento de categorías PRIZE, botón primario |
| `--copper-duo` | `#D08050` | Duotono de fotos PRIZE |
| `--sage` | `#5E9488` | Acento de categorías HONORARY |
| `--sage-duo` | `#7FAFA4` | Duotono de fotos HONORARY |
| `--kraft` | `#C9A57B` | Sobre de la pantalla «Voto sellado» |

Estados (éxito / error): por definir en el rediseño; deben pasar AA sobre `--bg` y `--sheet`.

### Reglas

- **Los acentos no cambian de tono:** cobre y salvia son idénticos de día y de noche (no usar versiones "profundas" para que se lean sobre claro).
- **Sobre fondos claros, el cobre y la salvia nunca son texto pequeño:** van de relleno (sello de tipo de categoría, etiqueta «Nº», «Tu voto», casilla marcada, botón primario, sello de cera) con texto `--ink` encima. Sobre la noche sí pueden ser texto.
- **Pedacitos de noche en la web:** la cuenta regresiva y las cartas boca abajo de Nominados van sobre `--ink`, con cifras y detalles en cobre.
- **Tipografía:** solo **Unbounded** (600/700/800: títulos, números, etiquetas, botones) y **Schibsted Grotesk** (400/600/700 e itálica: texto, nombres, frase del nominado), vía `next/font`.
- **Forma:** esquina cortada en diagonal (chaflán) en tarjetas, botones, etiquetas y fotos: `clip-path: polygon(N 0, 100% 0, 100% calc(100% - N), calc(100% - N) 100%, 0 100%, 0 N)`. Para un borde fino con chaflán, envolver en un contenedor con el color del borde y 1px de padding.
- **Fotos:** siempre en duotono (cobre para PRIZE, salvia para HONORARY) para igualar fotos de distinta calidad; sin foto, iniciales en `--ink` sobre `--sand`.
- **Logo:** rombo + cono (trofeo abstracto) en cobre + nombre del evento.
- **Fondo:** haces de luz suaves en diagonal (de día, blanco translúcido; de noche, luz de `--sheet` muy tenue). Respetar `prefers-reduced-motion`.
- **Accesibilidad:** contraste AA (por eso la regla de los acentos), foco visible, botones de mín. 48px de alto, animaciones reducidas si el usuario lo pide.

### Componentes y pantallas

- **Botones:** primario cobre con texto tinta y chaflán; secundario transparente con borde de 1.5px en tinta. Filtro seleccionado: fondo tinta con texto `--sheet`.
- **Papeleta (Nominar / Votar):** hoja `--sheet` con filo `--line` sobre `--bg`, cabecera con doble regla (2px + 1px de tinta) y sello de tipo de categoría rotado. En Votar, fila completa tocable con foto, frase, «Tu voto» y casilla que se llena de cobre. En PC, la papeleta va al centro con el índice o el resumen a un costado.
- **Nominados = «Cartelera»:** índice de las categorías (con marca premio/honorífica) y una categoría a la vez «en escenario»: número grande, consigna y los finalistas de pie sobre una línea de escenario, con nombre y frase debajo, sin conteos. En móvil, chips de categorías arriba y deslizar. Antes de los finalistas: cartas boca abajo de noche y cuenta regresiva.
- **¡Listo! (voto sellado):** sobre kraft con sello de cera cobre, «Tu voto quedó guardado en secreto» y por qué nadie lo ve. Sin comprobante.
- **Premiación (noche):** fondo `--ink`, reflectores laterales, piso en perspectiva, número de categoría gigante al fondo, trofeo facetado en cobre y fila de finalistas.

---

## 10. Estructura de carpetas sugerida

```
src/
  app/
    s/[roomCode]/(page, nominados, nominar, votar)
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
public/sounds/            # drumroll, fanfare (libres de derechos)
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
- [x] **Fase 7 — Ceremonia:** carga de llave, conteo en memoria, cuántos votaron, secuencia de revelación completa con sonido y confeti, controles de teclado, empates
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

- Nombre del evento y del grupo (identidad visual)
- Fecha de la reunión (para programar fases)
- ~~¿Quién será el notario?~~ **Decidido (2026-11-12):** el mismo organizador.
- ~~¿Se permite omitir una categoría al nominar o votar (abstención)?~~ **Decidido (por ahora):** sí en ambos casos; queda configurable por evento (`allowNominationSkip`, `allowVoteAbstention`) por si cambia. Nadie puede nominarse a sí mismo.
- ¿Mostrar el % del ganador o solo el nombre?
- Número de finalistas por categoría (3, 4 o 5)
- ¿Fotos de los finalistas en la ceremonia?

---

## 14. Forma de trabajo para Claude Code

- Trabajar fase por fase; al terminar una, resumir qué se hizo y qué sigue.
- Antes de tocar cualquier cosa relacionada con papeletas, releer la sección 4.
- Preferir componentes simples y legibles; nada de dependencias innecesarias.
- Mantener `.env.example` actualizado (`DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`).
- Si una decisión de la sección 13 bloquea el trabajo, preguntar en vez de asumir.
