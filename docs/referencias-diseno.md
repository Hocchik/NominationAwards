# Referencias de diseño para el rediseño de NominacionesDP

> Documento de trabajo para preparar el rediseño visual final. El diseño "Gala" actual (CLAUDE.md §9) es provisional: se percibe genérico, "muy IA". Esto es solo investigación: no implica cambios en el código.
> Fecha: noviembre de 2026.

## Cómo leer este documento

- **17 referencias** en tres grupos: premiaciones y ceremonias, votación y UX móvil, y revelación/tipografía/movimiento. Al final hay **fuentes para seguir buscando** (galerías, tipografías gratuitas) y **4 direcciones visuales**.
- Cada referencia dice qué la hace destacar y qué idea concreta tomar, indicando la pantalla de destino: **Sala** (`/s/[roomCode]`), **Nominar**, **Votar**, **Listo** (comprobante), **Ceremonia** (16:9).
- ⚠️ marca cuándo una idea choca con las reglas de anonimato (CLAUDE.md §4).
- Las descripciones salen de los casos de estudio y la prensa enlazados, no de haber revisado cada sitio en vivo. Conviene abrir cada uno para verlo en movimiento antes de decidir.

---

## Qué evitar: señales de "hecho por IA"

Lo que hoy hace que una interfaz se lea como plantilla generada:

- Azul noche + dorado + glassmorphism + degradados radiales + partículas bokeh (es decir, el "Gala" actual).
- Texto con degradado, destellos decorativos, íconos genéricos de trofeo o estrella.
- Portada centrada con titular, subtítulo y dos botones; rejillas de tarjetas idénticas con el mismo radio de borde en todo.
- Tipografías por defecto: Inter, Playfair Display, Poppins, Montserrat. También las "de moda" que ya se perciben como plantilla: Space Grotesk, Satoshi, Clash Display, Instrument Serif, Fraunces.
- Confeti dorado + redoble de tambor como única idea de celebración.
- Degradados morado-azul y sombras de color difuminadas ("glow").

**Antídoto:** partir de un **concepto** propio del evento (el secreto, el sobre, el notario, el barrio, la fiesta) y de una **restricción** (dos tintas, una sola familia tipográfica, papel), no de efectos.

---

## 1. Premiaciones y ceremonias

### 1.1 D&AD Awards: identidad "Drawn to" (JKR + Studio DRAMA)

- **URL:** https://www.dandad.org · caso: https://www.dandad.org/insights/features/how-studio-drama-created-pencil-gothic-a-custom-typeface-for-dad · https://www.creativebloq.com/design/branding/dandad-new-identity
- **Qué destaca:** toda la identidad sale de un único objeto (el Pencil, el lápiz-trofeo) y de una tipografía hecha a medida, *Pencil Gothic*, que se deforma en el escenario, la señalética y los gráficos de transmisión. Además, los niveles de premio se distinguen por **material**: Wood, Graphite, Yellow y Black (y White para impacto social), no por "más brillo".
- **Idea para la app:** distinguir **PRIZE vs HONORARY por material o tratamiento**, no solo por tono (por ejemplo: premio = tinta sólida, honorífica = contorno o papel). Elegir un único objeto-símbolo propio del grupo que se transforme en las transiciones de la **Ceremonia**.

### 1.2 BAFTA: identidad 2026 (Studio Kiln)

- **URL:** https://www.bafta.org · caso: https://www.creativereview.co.uk/studio-kiln-bafta-awards-refreshed-identity/ · https://www.creativeboom.com/insight/how-studio-kiln-built-one-particle-system-to-unify-all-four-of-baftas-awards/
- **Qué destaca:** se diseñó **primero el movimiento** y después logos, tipografía y maquetación. Un único sistema (Figma + Cavalry) genera las piezas de las cuatro ceremonias (Cine, TV, Juegos, Oficios de TV).
- **Idea para la app:** en la **Ceremonia**, definir antes el "gesto" de la revelación (cómo entra, cómo se sostiene el suspenso, cómo estalla) y derivar de ahí la UI estática. Ojo: sus partículas son un sistema con lógica propia, no decoración de fondo; no confundirlas con el bokeh que queremos dejar atrás.

### 1.3 The Game Awards: logo 2025 (Studio Herrström)

- **URL:** https://thegameawards.com · caso: https://www.creativebloq.com/design/logos-icons/the-new-game-awards-logo-shows-less-can-be-a-lot-more
- **Qué destaca:** reduce las alas del trofeo a un trazo monolineal. De la geometría simétrica del logo sale una biblioteca de marcos y patrones que se usa en los overlays de pantalla y en los fondos del escenario.
- **Idea para la app:** diseñar el logo de forma que de su geometría salgan los **marcos de las tarjetas de finalistas** y los fondos 16:9. Coherencia sin efectos de stock.

### 1.4 Dezeen Awards: gráfica de la ceremonia (Micha Weidmann Studio)

- **URL:** https://www.dezeen.com/awards/ · caso: https://www.dezeen.com/?p=1290456 · identidad 2024: https://www.dezeen.com/2024/02/15/dezeen-awards-2024-identity-micha-weidmann/
- **Qué destaca:** la intensidad del color y del movimiento sube y baja a lo largo de la noche, respondiendo a lo que pasa en el escenario. La misma regla se aplica a entradas, señalética y folletos impresos.
- **Idea para la app:** una **curva de intensidad** para la Ceremonia: portada y lista de comprobantes en calma, cada categoría un poco más intensa, el pico en el último premio. Las honoríficas (que se revelan primero) viven en la parte baja de la curva.

### 1.5 The Webby Awards: People's Voice y discursos de cinco palabras

- **URL:** https://www.webbyawards.com · votación: https://vote.webbyawards.com · cifras 2026: https://primacy.com/news/2026-webby-peoples-voice-award
- **Qué destaca:** votación pública a escala enorme y organizada por categorías (en 2026, más de 4,6 millones de votos de unas 940 mil personas, según Primacy). Y una tradición memorable: los ganadores dan discursos de **solo cinco palabras**.
- **Idea para la app:** limitar la frase opcional del finalista (`blurb`) a cinco palabras: un "discurso de cinco palabras" que aparece tras la revelación. Corto, gracioso y legible en el proyector.

### 1.6 Type Directors Club (TDC, The One Club)

- **URL:** https://www.tdc.org · https://www.oneclub.org/tdcawards/ · sitio de una edición anterior: https://anagrama.com/project/tdc-web
- **Qué destaca:** cada edición encarga una identidad tipográfica distinta a un estudio (TDC72: animación tipográfica a medida de Morcos Key; TDC66: sitio de Anagrama).
- **Idea para la app:** separar **plataforma** de **edición**. La app tiene una base sobria y cada edición del grupo trae su propio "cartel": una tipografía display, un par de colores y el nombre de la edición. Así el rediseño de 2027 es cambiar el cartel, no la app.

### 1.7 Windham-Campbell Prizes (Pentagram)

- **URL:** https://www.pentagram.com/work/windham-campbell-prizes · edición 2025: https://pentagram.com/work/windham-campbell-prizes-2025
- **Qué destaca:** no tiene logo como tal. La identidad es color más un vocabulario de **corchetes** (que también evocan agrupar personas y las llaves de un torneo). En 2025 el recurso pasa a ser unas comillas gigantes.
- **Idea para la app:** usar un **signo tipográfico** como recurso del sistema: corchetes para encerrar a los finalistas, comillas grandes para las consignas ("¿Quién es más probable que…?"). PRIZE y HONORARY usan dos variantes del mismo signo.

### 1.8 El sobre de los Óscar (Marc Friedland)

- **Referencias:** https://variety.com/2015/film/news/envelope-maker-marc-friedland-created-an-iconic-complement-to-oscar-statuette-1201435483 · https://creativepro.com/get-sneak-peek-oscars-envelopes/
- **Qué destaca:** el sobre nació para **evitar que se filtraran los ganadores**. Desde 2011 es de papel metálico con forro rojo laqueado; la tarjeta lleva el nombre en tinta carbón, y su producción implica unos diez procesos (grabado, relieve…). No cambia de un año a otro: es icónico precisamente por eso.
- **Idea para la app:** es la metáfora exacta de nuestro `crypto_box_seal` ("caja sellada"): **cada papeleta es un sobre lacrado que solo el notario abre**. Sirve para la pantalla de envío ("Tu sobre está sellado"), el comprobante y la revelación (abrir el sobre). Ver la dirección A.

### 1.9 Eurovision: tablero de votación

- **URL:** https://eurovision.tv · tablero 2021: https://escxtra.com/2021/05/06/eurovision-2021-scoreboard-graphics-revealed/ · cambios de 2019: https://escinsight.com/2019/03/31/eurovision-song-contest-new-voting-rules-presentation-televote-sequence/
- **Qué destaca:** una coreografía de revelación pensada para verse de lejos: gráficos derivados del logo, un tablero blanco (2021) más legible que los anteriores y un orden espacial fijo para seguir quién va arriba.
- **Idea para la app:** aprender **ritmo y legibilidad a distancia** para el proyector: fondo claro o muy contrastado, orden constante, un solo foco de atención a la vez.
- ⚠️ **Nunca** adoptar el marcador de puntos: la regla 8 prohíbe mostrar conteos. Tomar el ritmo, no el tablero.

---

## 2. Votación, nominación y UX móvil

### 2.1 Jackbox Games: el teléfono como control

- **URL:** https://www.jackboxgames.com · para unirse: https://jackbox.tv · artículo: https://builtin.com/articles/jackbox-games-design-party-pack
- **Qué destaca:** entrar es ir a una dirección corta y escribir el código de la sala. El teléfono es el control y la pantalla grande es el escenario. El teléfono **no repite** lo que sale en la tele: muestra el logo para que levantes la vista. Diseño obsesionado con quitar fricción ("The Jack Principles").
- **Idea para la app:** **Sala** tan simple como Jackbox: código grande, nombre, PIN, listo. **Ceremonia**: si alguien abre la app durante la gala, que vea solo "Mira la pantalla grande" y el nombre de la categoría en curso.
- ⚠️ En Jackbox se ve quién respondió qué; aquí nunca.

### 2.2 Typeform: una pregunta por pantalla

- **URL:** https://www.typeform.com · historia del formato: https://www.smashingmagazine.com/2014/09/26/sci-fi-frustrations-flash-and-forms-the-typeform-story/
- **Qué destaca:** una pregunta a la vez y tipografía grande (su equipo notó que pocas fuentes web se leen bien por debajo de 16 px). Barra de progreso, estimación de tiempo en la bienvenida y "tocar más, escribir menos".
- **Idea para la app:** en **Nominar** y **Votar**, una categoría por pantalla con la consigna en grande, chips de participantes para tocar (no para escribir), "~5 min" en la portada del formulario y un progreso tipo "7 de 18".

### 2.3 Partiful: la invitación como marca

- **URL:** https://partiful.com · reseña: https://www.apartmenttherapy.com/partiful-review-37193743
- **Qué destaca:** cada evento es un cartel con imagen y una frase con chiste que marca el tono, más temas de fondo y efectos (confeti, fuegos artificiales, burbujas), lista de invitados y comentarios.
- **Idea para la app:** la **Sala** como invitación-cartel de la edición (nombre, fecha, una frase del grupo), no como landing de producto. Los efectos se reservan para momentos clave, como el envío de la papeleta.
- ⚠️ Mostrar quién ya está registrado puede estar bien, pero nunca el orden ni la hora de envío de las papeletas (regla 3).

### 2.4 Tickets personalizados de Vercel Ship / Next.js Conf

- **URL:** https://vercel.com/ship · filosofía: https://dx.tips/non-fungible-tickets · plantilla abierta: https://vercel.com/templates/template/virtual-event-starter-kit
- **Qué destaca:** la entrada lleva tu nombre y tu cara, y la gente la comparte porque "a la gente le interesa sobre todo ella misma". Las versiones recientes son una credencial colgante que gira y muestra un QR.
- **Idea para la app:** en **Listo**, el comprobante como **entrada a la ceremonia**: un talón con el código (`K7M-29Q`), el nombre de la edición y la fecha, con el gesto de girarlo o arrancarlo.
- ⚠️ Si se puede compartir, el talón **no debe combinar nombre + código de comprobante**: el código viaja dentro de la papeleta cifrada y quien la descifre podría vincularla a la persona. Opción: una versión para compartir con el nombre y sin el código.

### 2.5 Spotify Wrapped

- **URL:** https://newsroom.spotify.com/tag/wrapped/
- **Qué destaca:** revelaciones secuenciales en formato historia, con tipografía enorme. En 2025, el concepto fue un "mixtape visual" con texturas que mezclan lo analógico y lo digital; según la prensa, sobre una base en blanco y negro, con el color reservado a las imágenes de los artistas.
- **Idea para la app:** **Listo** y la página de recuerdo (fase `FINISHED`) como historias de 4 a 6 tarjetas. Y la contención cromática: base neutra, color solo para el ganador.

---

## 3. Revelación, tipografía y movimiento (pantalla 16:9)

### 3.1 Saul Bass en Art of the Title

- **URL:** https://www.artofthetitle.com/designer/saul-bass/ · https://www.artofthetitle.com/feature/the-title-design-of-saul-and-elaine-bass/
- **Qué destaca:** secuencias de títulos con formas recortadas planas, cortes con ritmo y la tipografía como protagonista. Art of the Title es además un archivo enorme de créditos de cine y series para seguir buscando.
- **Idea para la app:** cada categoría abre con una **"secuencia de título" de 5 a 8 segundos**: formas planas que entran a ritmo, la consigna en grande y un corte seco a los finalistas. Cine, no diapositivas.

### 3.2 Vestaboard: tablero split-flap

- **URL:** https://www.vestaboard.com/split-flap-display
- **Qué destaca:** un tablero mecánico de 6×22 caracteres inspirado en los paneles de las estaciones de tren. El traqueteo de las paletas es parte de la experiencia, y no "brilla" como una pantalla.
- **Idea para la app:** revelar el nombre del ganador **letra a letra, con paletas que giran** hasta componerlo; el sonido de las paletas reemplaza al redoble. También sirve para proyectar la lista de comprobantes. Existen implementaciones abiertas de referencia, por ejemplo https://github.com/masteryder/splitflap.

### 3.3 Carteles chicha (Elliot Túpac y la gráfica popular peruana)

- **Referencias:** https://theculturetrip.com/south-america/peru/articles/elliot-tupac-the-peruvian-artist-creating-social-change · https://en.wikipedia.org/wiki/Chicha_(art)
- **Qué destaca:** serigrafía con colores vivos y fluorescentes sobre fondo oscuro, letras gruesas y sinuosas rellenas de franjas de color, y la composición del cartel de fiesta: celebración popular, sin pretensión de lujo.
- **Idea para la app:** la **Sala** y la **Ceremonia** como carteles de la fiesta del grupo; las franjas de color de las letras distinguen las categorías PRIZE. Ver la dirección C.
- **Respeto:** es un arte popular con autores vivos. Inspirarse en el lenguaje (color, letra, composición), no copiar carteles concretos; si se quiere ir a fondo, encargar el lettering a un cartelista.

---

## 4. Fuentes para seguir buscando

### Galerías curadas

| Galería | Para qué sirve |
|---|---|
| [Awwwards](https://www.awwwards.com) | La referencia clásica. Filtrar por categoría (Events, Culture) y por color; cada sitio muestra puntajes de diseño, usabilidad, creatividad y contenido. |
| [Godly](https://godly.website) | Cada sitio se muestra en video: ideal para estudiar movimiento y transiciones. |
| [Siteinspire](https://www.siteinspire.com) | Curaduría sobria, con filtros por estilo y tipo de sitio. |
| [Land-book](https://land-book.com) | Portadas y landings; útil para la pantalla de Sala. |
| [Mobbin](https://mobbin.com) | Flujos reales de apps móviles (registro, formularios, confirmaciones). Acceso gratuito limitado. |
| [The FWA](https://thefwa.com) | Sitios experimentales e interactivos. |
| [CSS Design Awards](https://www.cssdesignawards.com) | Otra galería con jurado, más variada en estilos. |

### Tipografía, identidad y movimiento

- [Fonts In Use](https://fontsinuse.com): ver una fuente en proyectos reales antes de elegirla.
- [Typewolf](https://www.typewolf.com): tendencias tipográficas y alternativas gratuitas a fuentes comerciales.
- [Brand New (UnderConsideration)](https://www.underconsideration.com/brandnew/): rediseños de identidad comentados.
- [Creative Review](https://www.creativereview.co.uk), [Creative Boom](https://www.creativeboom.com), [It's Nice That](https://www.itsnicethat.com): prensa de diseño con casos de identidades de premios y festivales.
- [Codrops](https://tympanus.net/codrops/): tutoriales y demos de animación de texto (por ejemplo, revelado escalonado con GSAP).
- [Art of the Title](https://www.artofthetitle.com): créditos de cine y series, la mejor escuela para la pantalla 16:9.

### Tipografías gratuitas (costo $0)

- **[Google Fonts](https://fonts.google.com)** (licencia OFL): se sirven con `next/font/google` y no hay problema con un repo público.
- **[Velvetyne](https://velvetyne.fr)**: fundición libre (OFL, GPL u otra según la fuente); piden acreditar autor y fundición. Ejemplo útil: *Compagnon*, inspirada en máquinas de escribir.
- **[Fontshare](https://www.fontshare.com)** (Indian Type Foundry): gratis para uso comercial, pero con una licencia propia que restringe la redistribución. ⚠️ No subir sus archivos al repo público: usar su CDN o preferir fuentes OFL.

---

## 5. Direcciones visuales

Cuatro direcciones que no comparten paleta ni tipografía y que parten de un concepto, no de efectos. Todas deben resolver lo mismo: legibilidad en proyector, distinción PRIZE/HONORARY, mobile-first, fuentes gratuitas y una versión de la revelación con movimiento reducido (cortes en lugar de animaciones) para `prefers-reduced-motion`.

### A. "Sobre lacrado": papelería notarial

**Concepto:** la confianza es el corazón de la app, así que el lenguaje es el de los documentos que importan: papel, lacre, sellos de goma, máquina de escribir. Cada papeleta es un sobre que solo el notario abre.

- **Paleta:** papel `#F3ECDF` · tinta `#1C1A17` · kraft `#C9A57B` · lacre, PRIZE `#8E1C1C` · sello azul, HONORARY `#264A7E` · gris lápiz `#6E675E`.
- **Tipografías:** *Gloock* (Google Fonts, serif de alto contraste) para titulares, o *Boska* (Fontshare); *Newsreader* (Google Fonts) para el texto; *Courier Prime* (Google Fonts) o *Compagnon* (Velvetyne) para códigos, sellos y fechas.
- **PRIZE vs HONORARY:** lacre rojo frente a sello de tinta azul; PRIZE en cartulina gruesa, HONORARY en tarjeta de esquela.
- **En el celular:** la Sala es una invitación impresa; nominar es llenar fichas; al enviar, el sobre se pliega y se lacra ("Sellado. Nadie lo abre hasta la gala."); el comprobante es un sello de goma con el código.
- **Revelación:** un sobre kraft gigante con la categoría mecanografiada; el lacre se quiebra con un crujido y la tarjeta sale deslizándose; el nombre aparece "estampado" con una leve corrida de tinta; un sello "GANADOR" o "GANADORA" cae en diagonal con un golpe seco. En lugar de confeti dorado, tiras de papel.
- **Se sustenta en:** el sobre de los Óscar (1.8), Windham-Campbell (1.7), los tickets de Vercel (2.4).
- **Riesgo:** un fondo claro puede encandilar en una sala oscura. Solución: la ceremonia usa "el interior del sobre" (forro rojo oscuro o kraft) como fondo, y el papel claro queda solo para la tarjeta.

### B. "Marquesina": cine de barrio

**Concepto:** la noche de premios como un estreno en el cine del barrio: marquesina con bombillas, tablero de letras, talón de entrada y títulos de crédito.

- **Paleta:** negro cálido `#15110F` · crema marquesina `#F2E6CC` · rojo butaca `#B3202A` · ámbar bombilla `#FFB21A` · verde letrero (opcional) `#1F6B52`.
- **Tipografías:** *Big Shoulders* (Google Fonts, condensada, con variantes Inline y Stencil que parecen rótulos) para titulares + *Hanken Grotesk* (Google Fonts) para el texto.
- **PRIZE vs HONORARY:** PRIZE = marquesina **encendida** (ámbar con bombillas); HONORARY = tablero de letras **sin luz** (letras crema encajadas sobre negro).
- **En el celular:** la Sala es la cartelera ("Esta noche: …"), nominar es pasar por taquilla (las categorías como funciones) y el comprobante es un talón de entrada troquelado.
- **Revelación:** secuencia de título a lo Saul Bass (formas planas, corte seco); los finalistas aparecen en filas de split-flap; las paletas giran hasta componer el nombre del ganador; la marquesina se enciende en cadena con un zumbido eléctrico.
- **Se sustenta en:** Saul Bass en Art of the Title (3.1), Vestaboard (3.2), BAFTA (1.2), los tickets de Vercel (2.4).
- **Riesgo:** caer en el "retro de plantilla" (palomitas, claquetas). Se evita con tipografía seria y casi sin íconos.

### C. "Cartel chicha": fiesta fluorescente

**Concepto:** esto no es una alfombra roja, es la fiesta del grupo. El lenguaje es el de los carteles populares de cumbia: tintas planas que gritan.

- **Paleta (tintas planas, como en serigrafía):** negro `#0B0B0B` · rosa fluorescente `#FF2D95` · amarillo `#FFE500` · naranja `#FF7A00` · verde `#19E68C` · azul `#1FA2FF` · blanco `#FFFFFF` para el texto largo.
- **Tipografías:** lo ideal es un lettering propio para el nombre de la edición. Gratis: *Bungee*, *Bungee Shade* y *Bungee Inline* (Google Fonts, pensadas para rótulos), *Shrikhand* (Google Fonts) para las exclamaciones; el texto en *Familjen Grotesk* o *Archivo* (Google Fonts).
- **PRIZE vs HONORARY:** PRIZE = letras rellenas de franjas de tres tintas (amarillo, naranja, rosa), con franjas duras y no degradado suave; HONORARY = una sola tinta (verde o azul) con contorno.
- **En el celular:** la Sala es el cartel de la fiesta, con fecha y "con la participación de…" (los registrados); nominar con chips de color plano; al enviar, un sello de "¡Listo!" en tinta.
- **Revelación:** el cartel se "imprime" por capas: cada tinta golpea la pantalla con un ligero desfase de registro, como en serigrafía; el nombre del ganador entra en bloque con sus franjas de color, rodeado de un marco de puntos y estrellas planas. En lugar de redoble, un golpe de güiro o de cencerro.
- **Se sustenta en:** los carteles chicha (3.3), Partiful (2.3), Jackbox (2.1).
- **Riesgo:** fatiga visual y accesibilidad: lo fluorescente solo para titulares y el texto largo en blanco. Además, hay que inspirarse en el estilo sin copiar obras de cartelistas reales.

### D. "Titular": editorial tipográfico

**Concepto:** la premiación como portada de periódico o cartel suizo: una sola familia tipográfica a tamaño enorme, dos colores planos y una rejilla estricta. Sin efectos: el tamaño y el ritmo lo hacen todo.

- **Paleta:** papel `#F4F2EC` · negro `#111111` · bermellón, PRIZE `#FF3D17` · ultramar, HONORARY `#2A3BFF`.
- **Tipografías:** *Archivo* (Google Fonts, variable, con ejes de ancho y peso) para todo, más *Newsreader Italic* para las consignas. Alternativa para titulares gigantes: *Tanker* (Fontshare).
- **PRIZE vs HONORARY:** PRIZE = bloque de color a sangre con texto negro; HONORARY = texto en contorno, o en ultramar sobre papel.
- **En el celular:** la Sala es una portada con titular gigante y la fecha; nominar es un índice numerado de categorías; el comprobante parece un aviso clasificado con el código.
- **Revelación:** la categoría a sangre en 16:9; los finalistas como índice numerado; el suspenso se construye comprimiendo las letras (animando el eje de ancho de la fuente variable) mientras el resto de la pantalla se vacía; el nombre del ganador se expande hasta ocupar todo el ancho y el fondo se inunda de bermellón o ultramar. Debajo, su "discurso de cinco palabras".
- **Se sustenta en:** D&AD (1.1), TDC (1.6), Windham-Campbell (1.7), Spotify Wrapped (2.5), Webby (1.5).
- **Riesgo:** puede sentirse frío. Se compensa con el humor del grupo en los textos y con fotos de los finalistas en blanco y negro.

### Comparativa rápida

| | A. Sobre lacrado | B. Marquesina | C. Cartel chicha | D. Titular |
|---|---|---|---|---|
| Tono | Íntimo, ceremonioso | Teatral, nostálgico | Fiestero, ruidoso | Seguro, editorial |
| Fondo base | Papel claro (en la ceremonia, forro oscuro) | Negro cálido | Negro | Papel claro |
| Legibilidad en proyector | Alta | Alta | Media (cuidar lo fluorescente) | Muy alta |
| Esfuerzo de implementación | Medio-alto (sobre y lacre animados, texturas) | Medio (split-flap) | Medio (capas, lettering) | Bajo-medio (todo es tipografía) |
| Encaje con el relato de confianza | Muy alto | Medio | Bajo | Medio |

---

## 6. Siguiente paso sugerido (cuando toque el rediseño)

1. Elegir dos direcciones.
2. Maquetar para cada una solo dos pantallas: **Nominar** (móvil) y la **revelación** (16:9). Con eso se ve casi todo el sistema.
3. Mostrárselas al grupo y decidir (o votar la dirección con la propia app, como ensayo).
4. Como los tokens viven en `src/app/globals.css` y los componentes base en `src/components/ui/`, el rediseño debería ser cambiar tokens y componentes, no rehacer páginas.
