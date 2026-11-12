# Demo para probar y página de diseño — spec

Fecha: 2026-11-12 · Estado: aprobado en conversación, pendiente de revisión escrita

## Objetivo

Dos piezas nuevas para mostrar la app sin un evento real en marcha:

1. **Demo en `/demo`**: cualquiera puede recorrer Nominar → Nominados → Votar → Ceremonia con un grupo ficticio. Usa las pantallas reales, cifra de verdad en el navegador y no toca la base de datos.
2. **Página de diseño en `/diseno.html`**: un archivo HTML autónomo (`public/diseno.html`) que presenta el sistema «Día y noche» (CLAUDE.md §9). Se abre desde el sitio y también funciona suelto, por ejemplo en un portafolio.

## Fuera de alcance

- Admin, notario y cierre de nominaciones dentro del demo (se explican en una línea, no se juegan).
- Que los finalistas del demo salgan de lo que nominaste: son fijos. Un texto lo aclara.
- Guardar el progreso del demo entre recargas o entre dispositivos.
- Fotos en los finalistas del demo (se ven las iniciales, como cuando no hay foto).
- Mantener `diseno.html` sincronizado de forma automática con `globals.css`.

---

## Parte 1 — Demo (`/demo`)

### Enfoque

Se reusan los componentes reales (`NominationBallot`, `NomineesBoard`, `VoteBallotForm`, `CeremonyShow`) con props opcionales nuevas. El valor por defecto de cada prop es el comportamiento actual, así que las páginas reales no cambian. Descartado: copias simplificadas (más de mil líneas duplicadas que se desfasan) y un evento de prueba en la base (producción comparte la base y la app maneja un solo evento a la vez).

### Rutas

| Ruta | Contenido |
|---|---|
| `/demo` | Qué es el demo, los cuatro pasos en una línea cada uno, qué es real (la papeleta, el cifrado, el conteo) y qué es simulado (el grupo y sus votos). Botón «Empezar» → `/demo/nominar` |
| `/demo/nominar` | `NominationBallot` real con el grupo ficticio |
| `/demo/nominados` | `NomineesBoard` real, ya revelado, con los finalistas de ejemplo y una cuenta regresiva ficticia («La votación abre en») |
| `/demo/votar` | `VoteBallotForm` real y su pantalla «Voto sellado» |
| `/demo/ceremonia` | `CeremonyShow` real con un botón «Abrir la urna» en vez del archivo del notario |

Todas las páginas del demo son de cliente y estáticas: no leen la base, no usan cookies ni sesión y no llaman a server actions.

### Franja del demo

`DemoBanner`, en el layout de `/demo`: franja `sticky` arriba con «Demo · nada de esto se guarda», los cuatro pasos como navegación (con el paso actual marcado y ✓ en los pasos hechos) y un link «Salir del demo» → `/`. En la ceremonia la franja queda debajo del show, que ya usa `fixed inset-0 z-20`, así que no tapa el escenario.

### Datos de ejemplo — `src/lib/demo/fixtures.ts`

- **Grupo ficticio:** unos 12 nombres inventados (`Candidate[]`), comunes y sin parecido con personas reales del grupo.
- **Categorías:** 6 (4 `PRIZE` y 2 `HONORARY`), con consignas cortas y neutras en el tono del grupo.
- **Finalistas:** de 3 a 4 por categoría, con frase corta; algunos del grupo ficticio y al menos uno externo (`external: true`).
- **Reglas del demo:** las de un evento por defecto (`minNominations: 3`, `maxNominations: 5`, se permite omitir categoría y abstenerse).
- **Quién eres:** entras como «Invitado» (`selfName`); no apareces en la lista del grupo.
- **Votos simulados:** cada categoría trae una tabla fija `finalistId → votos` (unos 20 votantes ficticios). Una categoría queda **empatada** entre dos finalistas para que tu voto pueda decidirla; si no la desempatas, se ve el ganador compartido, como en el evento real.
- **IDs:** UUID v4 fijos escritos en el archivo, para que las mismas funciones y esquemas del evento real los acepten.

### Estado — `DemoProvider` (`src/app/demo/DemoProvider.tsx`)

Contexto de cliente montado en `src/app/demo/layout.tsx`. Guarda **solo en memoria**:

- `keys: KeyPair | null`: par de llaves de juguete generado con `generateKeyPair()` al entrar al demo. Mientras se genera, las papeletas muestran el esqueleto de carga.
- `nomination: { receipt } | null` y `vote: { receipt; ciphertext } | null`: lo que ya enviaste.
- `reset(part)`: vuelve a dejar Nominar o Votar sin enviar.

Recargar o salir borra todo. No usa `localStorage` ni `sessionStorage` para las llaves ni para las papeletas (la misma regla 7 del evento real, aunque sean llaves de juguete). Los borradores de las papeletas siguen usando `sessionStorage` como hoy, con la clave de sala `DEMO`; no contienen nada sensible.

### Cambios en los componentes reales

**`NominationBallot` y `VoteBallotForm`** (`src/app/s/[roomCode]/…`):

- `onSubmit?: (ciphertext: string, receipt: string) => Promise<{ ok: boolean; message?: string }>`. Por defecto llama a `submitNominationAction` o `submitVoteAction` con `roomCode`, como hoy. El demo pasa una función que guarda el texto cifrado en el `DemoProvider` y responde `{ ok: true }`.
- `doneLink?: { href: string; label: string }`: el botón de la pantalla de papeleta sellada. Por defecto es `{ href: "/s/${roomCode}/nominados", label: "Ver nominados" }`, como hoy. El demo pasa «Ver nominados» → `/demo/nominados` al nominar e «Ir a la ceremonia» → `/demo/ceremonia` al votar.
- El sellado no cambia: `sealPayload` con la llave pública recibida y el tamaño fijo que el demo calcula con las mismas funciones del evento real (`nominationBallotBytes` y `voteBallotBytes`, según sus categorías y reglas).

**`CeremonyShow`** (`src/app/ceremonia/CeremonyShow.tsx`):

- `openBallots?: () => Promise<{ keys: KeyPair; ciphertexts: string[] }>`. Si llega, la pantalla de inicio muestra un botón «Abrir la urna» en lugar de «Elegir archivo de llaves…». Si no llega, todo sigue igual: archivo del notario, `parseKeyFile`, verificación de la llave pública y `getVoteBallotsAction()`.
- La parte que abre cada papeleta, la valida con `voteBallotSchema`, cuenta con `tallyVotes` y arma los resultados se extrae a `openAndTallyVotes(ciphertexts, keys, categories)` en `src/lib/ballots/openVotes.ts`, para que los dos caminos usen exactamente el mismo código y se pueda probar fuera del componente.
- La pantalla de inicio acepta un texto opcional (`intro?: ReactNode`) para explicar el demo («Se abren tu voto y los de 20 amigos ficticios»); si aún no votaste, ahí mismo va el aviso con el link a `/demo/votar`.

### Cómo se arma la urna del demo — `src/lib/demo/simulate.ts`

Al tocar «Abrir la urna»:

1. Se expanden las tablas de votos simulados en ~20 papeletas `VoteBallot` (el votante *i* recibe el voto *i* de cada categoría; las categorías con menos votos quedan como abstención para los últimos votantes). Cada una lleva su comprobante de `generateReceiptCode()`.
2. Cada papeleta se sella con `sealPayload` y la llave pública del demo, igual que una real.
3. Se suma tu voto sellado, si votaste.
4. `openBallots` devuelve las llaves del demo y los textos cifrados, en orden barajado (regla 9).

El resultado es determinista salvo por tu voto y por los comprobantes. La lista de comprobantes de la ceremonia incluye el tuyo, así que puedes buscarlo como en la gala.

### Pantallas cuando ya enviaste

- **`/demo/nominar` con nominación enviada:** tarjeta «Ya enviaste tus nominaciones del demo» con tu comprobante y los botones «Ver nominados» y «Nominar de nuevo» (`reset("nomination")`).
- **`/demo/votar`:** lo mismo, con «Ir a la ceremonia» y «Votar de nuevo».
- **`/demo/ceremonia` sin voto:** se puede abrir la urna igual (solo con los simulados); el texto de inicio sugiere votar primero.
- **Justo después de enviar** se ve la pantalla sellada real (sobre y comprobante). La tarjeta «Ya enviaste» aparece solo si vuelves a entrar al paso.

### Portada

En `src/app/page.tsx`, junto a «¿Quién puede ver mi voto?», un botón «Pruébalo: demo» → `/demo`.

### Anonimato (CLAUDE.md §4)

- El demo no llama a server actions ni a la base, ni escribe cookies. Las páginas reales no cambian de comportamiento: todas las props nuevas son opcionales y su valor por defecto es el código actual.
- Las llaves del demo viven solo en memoria. No se registran papeletas ni conteos en consola.
- La ceremonia del demo muestra solo ganadores, igual que la real (regla 8).

---

## Parte 2 — Página de diseño (`public/diseno.html`)

### Forma

- Un solo archivo con su CSS en un `<style>` y sin JavaScript (la cuenta regresiva de muestra lleva cifras fijas).
- Fuentes desde Google Fonts: Unbounded 600/700/800 y Schibsted Grotesk 400/600/700 e itálica.
- Valores copiados de `src/app/globals.css`, con un comentario arriba que lo dice y pide actualizarlo si el diseño cambia.
- Se sirve en `/diseno.html` (Next sirve `public/` tal cual) y funciona abierto como archivo suelto.
- Responsive: se lee en celular (gutter de 16 px, sin scroll horizontal) y en PC.
- `<title>`: «Diseño · Día y noche».

### Secciones

1. **Portada:** logo (rombo + cono en cobre) y la idea: un sistema, dos momentos; la noche es el día con los papeles cambiados.
2. **Colores:** una ficha por token con nombre, hex y uso, en dos bloques (día y noche) y los acentos aparte, con la regla «los acentos no cambian de tono».
3. **Tipografía:** muestras de Unbounded (títulos, números, botones, códigos) y Schibsted Grotesk (texto, nombres, frase en itálica) con sus pesos.
4. **Forma:** el chaflán en tamaños distintos y el truco del borde fino (contenedor del color del borde con 1 px de padding).
5. **Componentes:** botón primario y secundario, filtro seleccionado, chips de premio y honorífica, campo, tarjeta, sello de tipo rotado, casilla vacía y marcada, sello de cera.
6. **Pantallas en miniatura:** una fila de la papeleta de voto («Tu voto»), la cuenta regresiva de noche, el comprobante de «Voto sellado» sobre el sobre kraft, las cartas boca abajo de Nominados, los finalistas de pie sobre la línea de escenario y una escena de la ceremonia (fondo tinta, reflectores, número gigante, trofeo facetado, finalistas).
7. **Reglas:** contraste AA; cobre y salvia nunca como texto chico sobre claro (van de relleno con tinta encima); botones de mínimo 48 px; foco visible; animaciones reducidas con `prefers-reduced-motion`; fotos siempre en duotono.
8. **Cierre:** link al demo (`/demo`) y al repo público.

---

## Pruebas

- **Unitarias (Vitest):**
  - `fixtures`: IDs únicos y en formato UUID; cada finalista pertenece a su categoría; los totales de votos simulados no pasan de los ~20 votantes; existe exactamente una categoría empatada.
  - `simulate`: con las mismas tablas da las mismas papeletas (salvo los comprobantes); sellar → abrir con la función compartida de la ceremonia → ganadores esperados; tu voto en la categoría empatada la desempata. Así la función compartida queda probada por el mismo camino que usa el demo.
- **Sin regresiones:** `npm test`, `tsc` y `lint` limpios; las páginas reales de nominar, votar y ceremonia siguen pasando sus props de siempre.
- **Visual:** capturas con Edge headless del demo completo (celular 375 px y PC) y de `/diseno.html` en las dos medidas, comparando con las pizarras R5.
- **Red:** en el navegador integrado, recorrer el demo completo y confirmar que no hay ninguna petición POST ni de server actions.

## Documentación

- CLAUDE.md §7: agregar las filas de `/demo` (y sus pasos) y `/diseno.html`.
- Nada de esto cambia el modelo de datos ni la máquina de fases.
