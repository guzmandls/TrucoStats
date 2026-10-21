# TrucoStats — Desarrollo

## Etapa 0 — Preparación del proyecto

Hecho:

- Limpieza del proyecto base de Vite (se sacó el contenido de ejemplo).
- Estructura de carpetas en src (components, features, lib, types, test).
- ESLint para revisar el código.
- Prettier para dar formato uniforme.
- Vitest + Testing Library para pruebas automáticas.
- README con descripción y comandos.
- Git con ramas y commits; repositorio en GitHub.

Commits: 17509c8, 96203b0, f60ae07, 90237d2

Conceptos y herramientas nuevos:

- React: librería para construir la interfaz con piezas reutilizables.
- Componente: cada pieza de la interfaz (por ejemplo, un botón).
- JSX: forma de escribir HTML dentro del código.
- TypeScript: JavaScript con tipos; avisa errores antes de ejecutar.
- Vite: levanta el entorno de desarrollo y arma la versión final (build).
- CSS Modules: estilos propios de cada componente, sin choques de nombres.
- npm / package.json: administrador de dependencias y lista de comandos.
- ESLint: detecta errores y malas prácticas en el código.
- Prettier: ordena y formatea el código automáticamente.
- Vitest: ejecuta las pruebas.
- Testing Library: ayuda a probar componentes como los usaría una persona.
- jsdom: simula un navegador dentro de las pruebas.
- Git / GitHub: control de versiones y respaldo del código.
- Rama y commit: línea de trabajo aparte y punto guardado con descripción.
- dist: carpeta con el resultado del build.

## Etapa 1 — Contador de truco

Hecho:

- Lógica del contador: sumar, deshacer y detectar ganador.
- Botones N (Nosotros) y E (Ellos): un toque suma 1; mantener presionado suma
  de a varios, cada vez más rápido.
- Botón Deshacer por equipo (revierte el último punto).
- Puntos objetivo configurables entre 10 y 100, de a 5.
- Al llegar al objetivo, pide confirmación (Sí/No) antes de finalizar.
- Pantalla de partida terminada.
- Diseño estilo cuadernola: papel rayado, símbolos de palotes, línea central
  arrastrable y barras negras arriba y abajo.
- Pruebas de la lógica y de los componentes.

Commits: 2943fcb, 7ef9e1d

Conceptos y herramientas nuevos:

- Estado (state): datos que cambian mientras se usa la app; al cambiar, la
  pantalla se actualiza sola.
- Hook: función que le da poderes extra a un componente.
- useState: guarda un valor que cambia.
- useEffect: ejecuta algo después de dibujar la pantalla.
- useReducer: maneja cambios de estado más complejos mediante acciones.
- Acción y reducer: el reducer decide el próximo estado a partir de una
  acción, por ejemplo "sumar punto" o "deshacer".
- Render: el dibujado de la pantalla a partir del estado.
- Props: datos que un componente le pasa a otro.
- Ref (useRef): valor que se guarda entre dibujados sin provocar cambios.
- SVG: formato de dibujo vectorial, usado para los palotes.
- Unidades relativas: tamaños que se adaptan al tamaño del celular.
- Pulsación larga con aceleración: sumar de a varios manteniendo el botón,
  con velocidad creciente.
- Prueba de lógica pura: probar funciones sin depender de la pantalla.

## Etapa 2 — Guardado local y PWA

Hecho:

- La partida en curso se guarda en el navegador y se recupera al abrir la app.
- Se guardan solo los puntos confirmados, no la pulsación en curso.
- Service Worker con caché: la app funciona sin internet tras la primera visita.
- Manifest con nombre, colores e íconos; íconos propios a partir de un logo.
- Meta tags para poder instalarla en iPhone.
- Pruebas del guardado y de la recuperación.

Estado: 37 pruebas en verde; lint, formato y build sin errores.

Commits: aad7b82, 057b8f4

Conceptos y herramientas nuevos:

- IndexedDB: base de datos dentro del navegador.
- Persistencia: guardar datos para recuperarlos después.
- Hidratación: al abrir la app, rellenarla con lo que estaba guardado.
- PWA: web que se puede instalar como app y funcionar sin internet.
- Manifest: archivo que indica nombre, íconos y colores de la app instalable.
- Service Worker: programa en segundo plano que guarda archivos en caché para
  permitir el funcionamiento sin internet.
- Caché: copia local de archivos, para no pedirlos al servidor cada vez.
- Contexto seguro: el navegador solo permite Service Workers en sitios HTTPS o
  en localhost.
- fake-indexeddb: simula IndexedDB dentro de las pruebas.
- @vite-pwa/assets-generator: genera los íconos de la PWA a partir de un logo.
- waitFor y act: herramientas de prueba para esperar cambios asíncronos.

## Etapa 3 — Publicación en Cloudflare

Hecho:

- Configuración para publicar la app en Cloudflare, que la sirve desde su red.
- Cloudflare sirve los archivos del build (dist) y cualquier ruta desconocida
  devuelve la app, de cara a futuras pantallas.
- Verificado localmente que el Worker sirve la app, el manifest y el service
  worker.
- Script npm run deploy para compilar y publicar de una vez.
- Se registró un subdominio workers.dev (paso único por cuenta).
- La app quedó publicada en https://trucostats.guzmandls.workers.dev
- Se fijó el account_id en wrangler.jsonc para evitar la detección automática
  de la cuenta, que falló la primera vez.

Commits: 9d81a9b, 2accf5c

Conceptos y herramientas nuevos:

- Hosting: servicio que mantiene la app accesible en internet.
- Cloudflare Workers: plataforma de Cloudflare que ejecuta código y sirve
  archivos en su red; será también el backend del proyecto.
- Assets estáticos: archivos fijos (HTML, CSS, JS, imágenes) que se suben tal cual.
- Wrangler: herramienta de línea de comandos para publicar en Cloudflare.
- wrangler.jsonc: archivo que indica qué publicar y desde qué carpeta.
- Build output (dist): carpeta con la app compilada que se sube al publicar.
- SPA y fallback: en una app de una sola página, las rutas desconocidas
  devuelven la misma página para que la app maneje la navegación.
- wrangler login / deploy: iniciar sesión en Cloudflare y publicar la app.
- Cuenta y account_id: identificador de la cuenta de Cloudflare donde se publica.
- Subdominio workers.dev: dominio propio gratuito donde quedan las apps
  publicadas; se registra una sola vez por cuenta.
- URL de producción: dirección https donde queda publicada la app.

## Etapa 4 — Ajustes del contador

Hecho:

- Deshacer quita un punto a la vez; manteniendo presionado quita varios de a uno,
  igual que los botones de sumar.
- El "No" al confirmar mantiene el marcador alcanzado; para corregirlo se usa
  Deshacer (antes retrocedía un punto solo).
- Al confirmar el ganador se inicia una partida nueva, conservando el objetivo
  elegido; todavía no pasa al historial.
- Se quitó la pantalla "¡Ganó X!" posterior a la confirmación.
- La línea divisoria central y la del marcador inferior comparten el mismo grosor.
- La barra de desplazamiento ya no descentra el dibujo (se reserva su espacio).
- Los símbolos empiezan media fila más abajo, sin pegarse al borde superior.
- Documento de requisitos actualizado (deshacer y finalización de partidas).

Estado: 41 pruebas en verde; lint, formato y build sin errores.

Commits: 707b7ec

Conceptos y herramientas nuevos:

- scrollbar-gutter: reserva el espacio de la barra de desplazamiento para que el
  contenido no se corra y quede centrado.
- Variable CSS (custom property): valor con nombre, como --divider-width, que se
  reutiliza en varios archivos para mantener un mismo grosor.
- Bandera de estado: dato simple (declined) que recuerda que se rechazó la
  confirmación del ganador.

## Etapa 5 — Alineación a los renglones y objetivo

Hecho:

- Todo lo que se apoya sobre el papel respeta los renglones: símbolos, textos y
  números quedan apoyados sobre la línea, con un pequeño margen, sin tocarla.
- Los símbolos ahora descansan sobre el renglón (antes colgaban desde arriba).
- La línea del medio de los palotes se recalculó a la nueva alineación.
- El selector de objetivo se movió del encabezado negro al centro del papel:
  "Objetivo:" a la izquierda y el número grande con los botones + y − en círculo
  a la derecha.
- El selector se centra verticalmente sobre los renglones y solo aparece antes
  de iniciar la partida.
- Los botones + y − son la excepción: se centran dentro de su renglón.
- Se corrigió un hueco de la línea divisoria central en la parte de arriba.
- La línea del marcador inferior (N | E) ahora comparte el grosor de la
  divisoria central.
- El número del objetivo y los botones quedaron un renglón más arriba, y la
  etiqueta "Objetivo:" más grande, con su parte inferior apoyada sobre el
  renglón.
- La línea del medio de los palotes bajó un renglón, para que el siguiente
  símbolo quede a un renglón de distancia.
- Documento de requisitos actualizado (alineación con los renglones).

Estado: 41 pruebas en verde; lint, formato y build sin errores.

Commits: b093a35, dd02521, 1c0d8d1

Conceptos y herramientas nuevos:

- ResizeObserver: avisa cuando un elemento cambia de tamaño, para recalcular
  posiciones.
- Encajar en una grilla (snap): calcular la posición como múltiplo de la altura
  del renglón para que quede siempre sobre una línea.

## Etapa 6 — Historial local de partidas

Hecho:

- Al confirmar el ganador, la partida finalizada se guarda en el historial
  (fecha, objetivo, puntajes y ganador).
- El historial se guarda en el mismo almacenamiento local (IndexedDB), en un
  almacén nuevo, sin tocar la partida en curso.
- Pantalla de historial: se abre con un botón "Historial" en la barra superior;
  lista las partidas de la más reciente a la más antigua y muestra el ganador.
- Rechazar la confirmación ("No") no guarda ninguna partida.
- Pruebas del almacenamiento, del hook y de la pantalla.

Estado: 49 pruebas en verde; lint, formato y build sin errores.

Commits: 7ecb0e9

Conceptos y herramientas nuevos:

- Almacén de objetos (object store): cada "tabla" dentro de IndexedDB.
- Clave autoincremental (autoIncrement): el navegador le asigna un id único a
  cada registro guardado.
- Migración de la base (onupgradeneeded): al subir la versión de la base se
  crean los almacenes nuevos sin perder los datos anteriores.
- Diálogo (role="dialog"): ventana que se superpone a la pantalla; se identifica
  para accesibilidad y pruebas.

Nota: esta etapa se revierte en la Etapa 7, al concluir que un historial basado
en "Nosotros" y "Ellos" no tiene sentido sin grupos e integrantes.

## Etapa 7 — Corrección: el historial necesita integrantes

Hecho:

- Se quitó el historial local que guardaba las etiquetas "Nosotros" y "Ellos".
  Esas etiquetas solo identifican cada lado durante la partida en curso y no
  sirven para ninguna estadística.
- Se mantiene el resto del contador y su persistencia. Para no romper la base de
  datos de quienes ya la habían abierto, se subió la versión y se eliminó el
  almacén viejo de partidas (que ya no se usa).
- Requisitos actualizados: el historial se consulta entrando al grupo; cada
  partida se identifica por sus integrantes (por ejemplo, "Juan y Pedro 30 – 21
  Luis y Ana"); y grupos e integrantes deben implementarse antes que historial y
  estadísticas.
- Próximo paso: cuentas, grupos e integrantes.

Estado: 41 pruebas en verde; lint, formato y build sin errores.

Commits: f1d3bb9

Conceptos y herramientas nuevos:

- Eliminar un almacén en una migración (deleteObjectStore): al subir la versión
  de la base se puede borrar un almacén que quedó en desuso, sin afectar al
  resto de los datos.
- Dato derivado vs. dato con significado: "ganó Nosotros" es un dato sin valor
  fuera de la partida; lo que tiene valor es qué integrantes ganaron y perdieron.

## Etapa 8 — Grupos, integrantes y navegación

Hecho:

- Modelo de datos: `Group` (con sus `Member`) y `Match` (partida con equipos,
  puntajes, ganador y duración), en `src/features/groups/types.ts` y
  `src/features/matches/types.ts`.
- Dos almacenes nuevos en IndexedDB: `groups` y `matches`. La base subió a la
  versión 4 para crearlos sin perder datos.
- Navegación entre pantallas con react-router-dom.
- Pantalla principal con la lista de grupos y accesos a partida rápida y a crear
  grupo; pantalla para crear grupo; pantalla de un grupo.
- La lista de grupos del dispositivo ("pertenencia") se guarda en localStorage.

Commits: 139944d, 27605e0, bd259bd, adf4a8f, 9885c99, 416818f

Conceptos y herramientas nuevos:

- Modelo de datos: la forma de la información (qué es un grupo, qué es una
  partida). Se define primero para que todas las pantallas hablen igual.
- Router y rutas: asocian una dirección (`/grupo/3`) con una pantalla. En una
  SPA no se recarga la página: cambia solo lo que se ve.
- Parámetro de ruta (`:id`): parte variable de la dirección, para abrir el grupo
  que corresponda.
- keyPath: campo del objeto que IndexedDB usa como identificador (aquí, `id`).
- localStorage vs. IndexedDB: localStorage sirve para datos chicos y simples (una
  lista de ids); IndexedDB, para objetos más grandes y consultas.
- Pantalla vs. lógica: la lógica (almacenamiento, cálculos) vive en archivos
  aparte de las pantallas, para probarla sin dibujar nada.

## Etapa 9 — Partida de grupo

Hecho:

- Pantalla para configurar la partida de grupo: modalidad (1v1, 2v2, 3v3) e
  integrantes de cada equipo.
- El contador recibe un "contexto" (partida rápida o de grupo con sus equipos).
- Al confirmar el ganador se guarda un `Match` completo con sus integrantes.

Commits: 6737db2, 5c0e1f9, 10b99d5, 207fac4

Conceptos y herramientas nuevos:

- Contexto de partida: datos que el contador necesita saber antes de empezar
  (tipo, grupo, equipos). Un mismo contador sirve para ambos tipos de partida.
- Custom hook (`useCounter`): función propia que junta estado y acciones del
  contador, para que la pantalla solo se ocupe de dibujar.

## Etapa 10 — Ranuras, historial de grupo y objetivo por modalidad

Hecho:

- Partida en curso por "ranura" (slot): una para la partida rápida y una por cada
  grupo. Se puede tener varias en curso a la vez sin pisarse.
- Historial de partidas dentro de cada grupo.
- El objetivo predeterminado depende de la modalidad.

Commits: 5a99878

Conceptos y herramientas nuevos:

- Ranura (slot): clave que identifica dónde se guarda cada partida en curso
  (`quick`, `group:<id>`). Antes había una sola y se sobrescribía.
- Migración de datos: al cambiar cómo se guarda algo, se convierte lo guardado
  antes al formato nuevo para no perderlo.

## Etapa 11 — Estadísticas, timer, perfil y sistema de diseño

Hecho:

- Timer de partida con pausa; la duración se guarda en el `Match`. Pausada, no se
  puede sumar ni restar.
- Estadísticas del grupo (podio, rankings, parejas y tríos, enfrentamientos),
  estadísticas por integrante y perfil personal.
- Sistema de puntos (Pts) calculado recorriendo las partidas en orden
  cronológico.
- Fotos de integrante (se reducen a 256 px y se guardan dentro del navegador) y
  avatar por defecto con color propio.
- Sistema de diseño compartido: componentes en `src/components/ui.tsx` y tokens
  (colores, grosores, espaciados) en `src/index.css`. Las reglas están en
  `requisitos.md` §11 y §12.
- Cambios respecto a la Etapa 4: Deshacer de un toque quita el movimiento
  completo (mantener quita de a un punto), y "No" al confirmar descuenta el punto
  que llegó al objetivo.
- Pruebas de flujo completo (`flow.test.tsx`), timer, estadísticas y pantallas.
- Se creó `docs/pendientes.md` para anotar deuda técnica.

Commits: bacc7b7

Conceptos y herramientas nuevos:

- Tiempo por tramos: el timer guarda los segundos de los tramos cerrados y el
  inicio del tramo activo; así la pausa no cuenta y no hace falta un reloj
  corriendo siempre.
- Función pura de estadísticas: recibe las partidas y devuelve los números. Si
  cambia una regla, se corrige y se prueba en un solo lugar.
- Dato calculado vs. guardado: los Pts no se guardan; se recalculan desde las
  partidas, así siempre coinciden con el historial.
- Canvas: lienzo del navegador; sirve para achicar las fotos antes de guardarlas.
- Data URL: imagen convertida a texto, para guardarla junto al resto de los
  datos.
- Tokens de diseño: valores con nombre (colores, grosores, espaciados) que se
  reutilizan en todos los estilos para que la app se vea coherente.
- Componentes compartidos: piezas de interfaz reutilizadas en todas las
  pantallas, en vez de repetir estilos en cada una.
- Deuda técnica: cosas que se dejan para después a propósito; se anotan para no
  olvidarlas.

## Etapa 12 — Revisión general del diseño

Hecho:

- Revisión de todas las pantallas con capturas en tamaño de celular (390 px).
- Escala tipográfica: los tamaños de texto salen de tokens (`--text-xs` a
  `--text-3xl`), no de números sueltos. Antes había 15 tamaños distintos.
- Más tokens: interletrado, texto secundario, fondo de barras, sombra y alturas
  mínimas. Un solo valor de "deshabilitado" para toda la app.
- Zonas táctiles de al menos 44 px (antes había botones de 32 y 40 px).
- Texto secundario con más contraste, y porcentajes en negro: el verde claro
  sobre crema casi no se leía. El color queda en barras y anillos.
- Pestañas inactivas contiguas separadas por una línea crema.
- Participantes: filas negras a todo el ancho, en vez de tarjetas flotantes.
- Colores de avatar distintos dentro de cada grupo (antes podían repetirse).
- Errores corregidos: la ficha del integrante no mostraba su nombre; el aviso de
  puntos del grupo usaba una variable CSS inexistente; los títulos largos
  cambiaban de tamaño según la pantalla.
- Componentes compartidos nuevos: `EmptyNote` (mensaje de lista vacía) y `Notice`
  (aviso a todo el ancho), que reemplazan copias sueltas en cada pantalla.
- Pruebas de puntos actualizadas a la fórmula real del código.

Estado: 240 pruebas en verde; build sin errores.

Conceptos y herramientas nuevos:

- Escala tipográfica: lista corta de tamaños de texto que se reutilizan; da
  coherencia y permite cambiar todo desde un solo lugar.
- Contraste: diferencia de luminosidad entre texto y fondo. Se recomienda 4,5:1
  para texto normal (WCAG, la guía de accesibilidad web).
- Zona táctil: área mínima que se puede tocar con el dedo sin errar; Apple
  recomienda 44 px.
- Capturas automáticas: se abrió Chrome sin ventana, controlado por código, para
  revisar cada pantalla con datos de prueba sin hacerlo a mano.
- Variable CSS inexistente: usar `var(--algo)` sin definirlo invalida la
  propiedad en silencio, sin avisar. Conviene revisar los tokens que se usan.

## Etapa 13 — Récords de partidas con detalle

Hecho:

- "Más larga", "Más corta" y "Mayor diferencia" ahora muestran el resultado, los
  equipos que jugaron y la fecha, en filas a todo el ancho (antes eran tres
  columnas con solo el resultado).
- Se quitó el nombre de ejemplo ("Los del barrio") del campo Nombre del grupo.
- Estadísticas nuevas: partida más reñida, mayor racha de derrotas, rachas de
  victorias y de derrotas en curso, y rivalidad más repetida.
- Desempates: en "más reñida" gana la partida que más duró; en "mayor
  diferencia", la que menos duró. En las rachas se muestran todos los que
  empatan (por ejemplo, compañeros de equipo).
- Una racha son al menos dos resultados seguidos; uno solo no cuenta. Si nadie
  la tiene, la fila igual aparece con un guion.
- "Más reñida" pasó a llamarse "Más pareja".
- Fotos en las estadísticas: récords, rachas, rivalidad, parejas y tríos, y los
  datos de la ficha individual. Si son varios, se apilan superpuestos
  (`AvatarStack`). La sección "Partidas" no lleva fotos.

- Estadísticas individuales: cada integrante muestra también sus puntos (Pts),
  y el nombre con su récord quedó apilado a la izquierda.
- Recorrido final: se revisaron menús abiertos, contador con puntos, pausa y
  diálogo de confirmación. El historial del grupo ahora escribe los equipos
  como "Juan - Pedro vs Luis - Ana", igual que las estadísticas (los nombres de
  un equipo se separan con un guion).

Conceptos y herramientas nuevos:

- Superponer elementos: un margen negativo hace que cada avatar tape un poco al
  anterior; un aro del color del fondo los separa visualmente.
- Datos con identidad: para mostrar una foto no alcanza el nombre; las
  estadísticas ahora devuelven el `id` de cada integrante para poder buscarla.

Conceptos y herramientas nuevos:

- Componente a medida dentro de una pantalla (`MatchRecord`): se usa tres veces
  con distintos datos, así que se escribe una sola vez.
- Adaptar el diseño al contenido: al agregar información, la grilla de tres
  columnas dejó de alcanzar y se cambió por una lista vertical.

## Etapa 14 — Backend: primer Worker

Hecho:

- Primer código de backend en `worker/index.ts`: un Worker con la ruta
  `/api/salud`, que responde `{"estado":"ok"}`.
- `wrangler.jsonc` ahora indica dónde está el Worker (`main`) y que las rutas
  `/api/*` las atiende él primero; el resto sigue sirviendo la app.
- Configuración de TypeScript propia para el Worker (`tsconfig.worker.json`) y
  tests en `worker/index.test.ts`.
- Probado en la PC con `npx wrangler dev`, sin publicar.

Conceptos y herramientas nuevos:

- Backend: programa que corre en un servidor y guarda o entrega datos. La app
  del celular no puede compartir datos entre usuarios por sí sola.
- Cloudflare Worker: ese programa, alojado en Cloudflare. Es gratuito en el
  plan básico y se publica junto con la app.
- API: la forma en que la app y el backend se hablan, mediante rutas
  (`/api/grupos`, `/api/partidas`). El prefijo `/api/` las separa de las
  pantallas de la app.
- Ruta de salud (health check): ruta que solo responde "estoy funcionando".
  Sirve para comprobar que el backend está vivo antes de construir sobre él.
- `wrangler dev`: corre el Worker en tu PC para probarlo sin publicar.
- JSON: formato de texto con el que la API devuelve datos
  (`{"estado":"ok"}`).

## Etapa 15 — Base de datos D1

Hecho:

- Se creó la base `trucostats-db` en la cuenta de Cloudflare (D1, plan gratuito).
- Se conectó al Worker en `wrangler.jsonc` (`binding: "DB"`): el código la usa
  como `env.DB`.
- Esquema inicial en `migrations/0001_esquema_inicial.sql`: tablas `groups`,
  `members`, `matches` y `match_players`.
- Migración aplicada solo en la copia local (`--local`); la base de Cloudflare
  sigue vacía.

Conceptos y herramientas nuevos:

- D1: base de datos SQL de Cloudflare (basada en SQLite). Guarda los datos
  compartidos entre todos los celulares.
- Migración: archivo SQL numerado que cambia el esquema de la base. Queda en
  Git y se aplica igual en la PC y en producción, en orden y una sola vez.
- Binding: nombre con el que el Worker accede a un recurso de Cloudflare
  (`env.DB`), sin escribir direcciones ni contraseñas en el código.
- Clave primaria y clave foránea: la primera identifica cada fila; la segunda
  la enlaza con otra tabla (`members.group_id` apunta a `groups.id`).
- `ON DELETE CASCADE`: al borrar un grupo se borran sus integrantes. En
  `matches.group_id` no se usa a propósito: las partidas se conservan.
- Índice: atajo que acelera las búsquedas frecuentes (partidas de un grupo).
- Local vs. remoto: `--local` usa una copia en tu PC para probar sin riesgo;
  `--remote` actúa sobre la base real.

## Etapa 16 — API de grupos con código de invitación

Hecho:

- `POST /api/grupos`: crea un grupo con sus integrantes y devuelve el grupo y su
  **código de invitación** (32 caracteres aleatorios).
- `GET /api/grupos/<código>`: devuelve el grupo con sus integrantes activos.
  Con el id del grupo no se puede entrar: hace falta el código.
- Validación de lo que envía la app (nombre, integrantes, administrador) con
  errores claros: 400 si algo es inválido, 409 si el grupo ya existe, 405 si el
  método no corresponde.
- Migración `0002_codigo_de_invitacion.sql`: agrega `invite_code` a `groups`.
- Tests con una base de datos simulada (`worker/testDb.ts`, SQLite de Node), sin
  depender de Cloudflare. Probado además con `wrangler dev` y `curl`.

Conceptos y herramientas nuevos:

- Método HTTP: `GET` pide datos, `POST` envía datos para crear algo. La misma
  ruta puede responder distinto según el método.
- Código de estado: número con el resultado (200 ok, 201 creado, 400 pedido
  inválido, 404 no existe, 405 método no permitido, 409 conflicto).
- Validar en el servidor: la app puede equivocarse o ser manipulada; el backend
  nunca confía en lo que recibe.
- Código de invitación como contraseña del grupo: 128 bits aleatorios no se
  pueden adivinar. Es simple y alcanza hasta que existan las cuentas.
- Id elegido por la app: la app crea el id del grupo, así un grupo creado sin
  conexión conserva el mismo id al sincronizarse después.
- Lote atómico (`batch`): guarda el grupo y todos sus integrantes juntos; si
  algo falla, no queda nada a medias.
- Dependencia de desarrollo (`@cloudflare/workers-types`): solo agrega tipos de
  TypeScript para `D1Database` y similares; no se incluye en la app publicada.
- Prueba de integración: probar la API con peticiones reales (`curl`) además de
  los tests automáticos.

## Etapa 17 — API de partidas

Hecho:

- `POST /api/grupos/<código>/partidas`: guarda una partida de grupo con sus
  equipos y puntajes.
- `GET /api/grupos/<código>/partidas`: lista las partidas del grupo, la más
  reciente primero.
- Validaciones: modalidad, fecha, duración, objetivo (10 a 100 de a 5),
  puntajes enteros, ganador con más puntos, equipos del tamaño de la modalidad,
  y que todos los jugadores sean integrantes del grupo.
- Solo se guardan partidas de grupo; las rápidas son personales y por ahora no
  tienen dónde asociarse (faltan las cuentas).
- Tests nuevos (`worker/matches.test.ts`) y prueba real con `wrangler dev`.

Conceptos y herramientas nuevos:

- Idempotencia: enviar la misma partida dos veces tiene el mismo efecto que
  enviarla una. Es clave para sincronizar: si se corta la conexión y la app
  reintenta, no se duplica nada.
- Ruta anidada (`/api/grupos/<código>/partidas`): la dirección refleja que las
  partidas pertenecen a un grupo.
- Integridad de datos: el servidor comprueba reglas del negocio (por ejemplo,
  que los jugadores pertenezcan al grupo), no solo el formato.
- Consulta con unión (`JOIN`): trae en una sola consulta los jugadores de todas
  las partidas del grupo, en lugar de una consulta por partida.

## Etapa 18 — La app envía el grupo al servidor (5a)

Hecho:

- Al crear un grupo, la app lo guarda primero en el celular y luego intenta
  registrarlo en el servidor en segundo plano. Si funciona, guarda el código de
  invitación en el grupo. Sin conexión no pasa nada: el grupo ya está guardado.
- Nueva opción **Invitar** en el menú del grupo: si el grupo todavía no está en
  el servidor, lo registra; después muestra un diálogo con el enlace y los
  botones Compartir (menú de compartir del teléfono) y Copiar enlace.
- Cada integrante debe tener nombre al crear el grupo (el servidor los exige).
- En desarrollo, las rutas `/api` de la app se redirigen al Worker local
  (`vite.config.ts`), así se prueba todo junto.
- Componentes compartidos nuevos: `Dialog` (base de los diálogos) e icono de
  compartir.
- Probado de punta a punta con Chrome: se creó un grupo desde la pantalla y el
  servidor lo devolvió con su código.

Conceptos y herramientas nuevos:

- Offline-first en la práctica: lo local manda; el servidor es una copia que se
  actualiza cuando hay conexión. Si falla, se reintenta cuando la persona lo
  necesita (al invitar).
- Cliente de API (`src/lib/api.ts`): un único lugar que hace los pedidos al
  backend, con límite de tiempo (8 s) y errores uniformes.
- Proxy de desarrollo: Vite reenvía `/api` al Worker, así la app y el backend
  parecen un solo sitio, igual que en producción.
- Web Share API (`navigator.share`): abre el menú de compartir del sistema
  (WhatsApp, etc.); si no existe, queda el botón de copiar.
- Fallar sin romper: lo que depende de la red se atrapa (`catch`) y se
  comunica con un mensaje claro, en lugar de dejar la app trabada.

## Etapa 19 — Unirse a un grupo con el enlace (5b)

Hecho:

- Pantalla `/unirse/<código>`: trae el grupo del servidor y pregunta "¿Cuál de
  los integrantes eres?". Al elegir uno aparece su nombre para cambiarlo por el
  tuyo. Al confirmar, el grupo se guarda en el celular y se abre.
- Ruta nueva en el servidor: `PATCH /api/grupos/<código>/integrantes/<id>`
  cambia el nombre de un integrante (también en las partidas ya guardadas).
- La app recuerda qué integrante es cada persona en cada grupo (`myMemberId`,
  solo en el celular). Con eso el encabezado del grupo vuelve a mostrar tus
  puntos; antes dependía de un dato que nunca se guardaba.
- Casos cubiertos: enlace inexistente, sin conexión (con "Reintentar"), grupo
  que ya estaba en el celular, nombre vacío y fallo al guardar el nombre.
- Probado con dos "celulares" (dos perfiles de Chrome): uno crea el grupo, el
  otro se une, se renombra y el servidor refleja el cambio.

Conceptos y herramientas nuevos:

- `PATCH`: método HTTP para modificar una parte de algo que ya existe (`POST`
  crea, `GET` lee, `PATCH` cambia un campo).
- Parámetro en la ruta del servidor: `/integrantes/<id>` indica a cuál se
  refiere, igual que `:code` en las rutas de la app.
- Identidad por celular: sin cuentas, el celular recuerda "yo soy este
  integrante". Se guarda dentro del grupo local y nunca se envía al servidor.
- Accesibilidad (`radiogroup` y `aria-label`): la lista de integrantes se marca
  como grupo de opciones para que los lectores de pantalla la entiendan.
- Dependencias de un efecto: al reintentar, cambiar un contador (`attempt`) hace
  que el efecto vuelva a ejecutarse.
- Probar con dos clientes: abrir dos perfiles de navegador es la forma más simple
  de simular dos celulares distintos.

## Etapa 20 — Enviar partidas al servidor (5c)

Hecho:

- Al terminar una partida de grupo se guarda primero en el celular y después se
  intenta enviar al servidor. Si no hay conexión, queda "pendiente" y se reenvía
  sola al abrir el grupo o cuando vuelve Internet. Pueden juntarse varias.
- Aviso discreto en el encabezado del grupo: un icono de nube tachada con la
  cantidad de partidas sin enviar. Cada partida pendiente también dice "Sin
  enviar". Todo desaparece cuando el servidor las confirma.
- Si el grupo todavía no estaba en el servidor (se creó sin conexión), se
  registra antes de enviar las partidas.
- Probado con el servidor real: una partida sin confirmar se envía al abrir el
  grupo y queda guardada en la base de datos.

Conceptos nuevos:

- Estado de sincronización: cada partida guarda `syncedAt` (cuándo la confirmó
  el servidor). Si falta, está pendiente. Solo vive en el celular.
- Idempotencia en la práctica: como el servidor ignora una partida repetida, se
  puede reintentar sin miedo a duplicarla.
- Reintentar con criterio: sin conexión o con el servidor caído se frena y se
  prueba más tarde; si el servidor rechaza una partida concreta, se sigue con las
  demás.
- Evitar envíos simultáneos: si ya hay un envío en curso y llega una partida
  nueva, se pide una vuelta más en lugar de lanzar dos envíos a la vez.
- Evento `online` del navegador: avisa cuando vuelve la conexión.

Pendiente de definir (ya en requisitos): cancelar y restaurar partidas, y
cambiar de administrador, necesitan cuentas.

Dato para más adelante: la PWA se puede publicar en Play Store (con PWABuilder,
unos 25 USD únicos) y App Store (con Capacitor, 99 USD por año); casi todo el
código se reutiliza. En iPhone, solo la app instalada en la pantalla de inicio
conserva sus datos de forma fiable y recibe notificaciones.

## Etapa 21 — Ver lo que hacen los demás (5d)

Hecho:

- Al abrir un grupo (y cuando vuelve la conexión) la app primero envía lo
  pendiente y después trae del servidor las partidas de los demás, los nombres
  cambiados, las fotos y el nombre del grupo. Dos celulares ven el mismo
  historial.
- Las partidas que ya estaban se actualizan si alguien cambió un nombre.
- Lo propio que todavía no se envió nunca se pisa; "quién soy yo" y el código de
  invitación se conservan.
- Las fotos de los integrantes ahora también viajan al servidor: el mismo
  `PATCH` de integrantes acepta nombre, foto o ambos (`null` quita la foto).
- Probado con dos celulares reales (dos perfiles de Chrome): cada uno jugó una
  partida, ambos terminaron con las dos y uno vio el nombre nuevo del otro.

Conceptos nuevos:

- Sincronización en dos sentidos: subir (push) lo propio y bajar (pull) lo
  ajeno. Siempre en ese orden, para no perder partidas propias.
- "El servidor manda": cuando hay conflicto sobre algo ya confirmado, vale la
  versión del servidor. Es la regla más simple y evita que dos celulares se
  pisen entre sí.
- Fusionar (`merge`): en lugar de reemplazar todo, se actualiza lo que cambió y
  se conserva lo que solo existe en el celular (como el código de invitación).
- Pedidos en paralelo (`Promise.all`): el grupo y sus partidas se piden a la vez.

## Etapa 22 — Búsqueda y scroll infinito en el historial

Hecho:

- Opción "Búsqueda" (con lupa) en el menú de las tres rayas del grupo.
  Así el encabezado queda despejado y el nombre del grupo no se corta. Al elegirla aparece un campo para buscar por jugador, fecha ("20/10" o
  "octubre"), resultado ("30-21") o modalidad. Se pueden combinar palabras:
  "juan 30" muestra las partidas de Juan con un 30. No distingue mayúsculas ni
  tildes.
- El historial muestra 20 partidas y carga 20 más al acercarse al final.
- Probado con 45 partidas: abre con 20, al deslizar llega a 40, y el filtro
  reduce la lista.

Conceptos nuevos:

- `IntersectionObserver`: avisa cuándo un elemento entra en pantalla. Se usa
  un elemento invisible al final de la lista para saber que hay que cargar más
  (scroll infinito), sin escuchar cada movimiento del scroll.
- Normalizar texto (`normalize('NFD')`): separa las letras de sus tildes para
  poder quitarlas y comparar sin importar acentos.
- Buscar en el celular, no en el servidor: tras sincronizar, todas las partidas
  del grupo ya están en el celular, así la búsqueda funciona también sin
  conexión.

## Etapa 23 — Cuentas en el servidor (6a)

Hecho:

- Rutas nuevas: `POST /api/registro` (usuario, contraseña y correo opcional; abre sesión),
  `POST /api/sesion` (iniciar sesión), `DELETE /api/sesion` (cerrar sesión) y
  `GET /api/yo` (quién soy según la sesión).
- Migración `0003_cuentas.sql`: tablas de usuarios y sesiones, y la columna
  `user_id` en los integrantes (para el vínculo, que viene después).
- Decisiones del usuario: cuenta con usuario y contraseña (el correo es
  opcional y sirve para recuperar la contraseña); obligatoria solo para crear
  grupos (la partida rápida sigue sin cuenta). Se entra con usuario o correo.

Conceptos nuevos:

- Hash de contraseña: nunca se guarda la contraseña, sino el resultado de
  mezclarla con una sal aleatoria muchas veces (PBKDF2, 100.000 vueltas). Es
  lento a propósito para que probar contraseñas robadas sea inviable.
- Sal (`salt`): texto aleatorio distinto por usuario; evita que dos personas con
  la misma contraseña tengan el mismo hash.
- Sesión con token: al iniciar sesión el servidor entrega un código largo
  aleatorio; la app lo manda en cada pedido (`Authorization: Bearer ...`). En
  la base solo se guarda su hash, así leer la base no permite usar sesiones.
- Mismo error para "no existe" y "contraseña mala" (401): así nadie puede
  averiguar qué correos tienen cuenta.
- Comparación en tiempo constante: no se corta en la primera diferencia, para
  no filtrar información por el tiempo de respuesta.

## Etapa 24 — Invitados, unirse y permisos en el servidor (6b)

Hecho:

- Cuenta invitada: al unirse a un grupo sin sesión, el servidor crea una cuenta
  sin correo ni contraseña y devuelve su token. La persona no ve nada de esto.
- Ruta `POST /api/grupos/<código>/unirse`: elige un integrante, opcionalmente
  cambia su nombre (también en las partidas ya guardadas) y queda vinculado.
  Un integrante ya elegido por otra persona responde 409.
- Una invitada se convierte en cuenta con correo registrándose con su misma
  sesión: es la misma cuenta, con su integrante y su historial.
- Permisos: crear grupo exige cuenta con correo; cambiar un nombre o foto, solo
  el administrador o el propio integrante; ver y registrar partidas, solo los
  integrantes vinculados. Cada partida guarda quién la registró (`created_by`).
- `GET /api/grupos/<código>` ahora dice qué integrantes ya fueron elegidos y,
  con sesión, cuál eres tú (`myMemberId`).
- Se editó la migración 0003 (todavía no estaba en producción) para que el correo
  y la contraseña puedan estar vacíos.

Conceptos nuevos:

- Autenticación vs. autorización: la primera responde "¿quién eres?" (la sesión);
  la segunda, "¿puedes hacer esto?" (ser administrador, ser el integrante). Los
  códigos HTTP lo reflejan: 401 = no iniciaste sesión, 403 = estás identificado
  pero no tienes permiso.
- Cuenta invitada (guest): patrón común para dar identidad sin fricción y
  pedir datos reales solo cuando hacen falta.
- Los tests de permisos prueban a quien no debería poder: sin sesión, de
  afuera del grupo, otro integrante.

## Etapa 25 — Cuentas en la app (6c)

Hecho:

- Pantallas "Registrarse" (usuario, contraseña y correo opcional; un botón "?"
  junto al título del correo explica para qué sirve) e "Iniciar sesión" (con
  usuario o correo). Se abren desde el menú de las tres rayas de la pantalla
  principal, que ofrece "Cerrar sesión" cuando hay sesión.
- Crear grupo pide una cuenta registrada: si falta, manda a registrarse y vuelve.
  Tu integrante aparece con tu usuario como sugerencia de nombre (editable).
- Unirse con el enlace no pide cuenta: se eligen integrantes que no estén
  tomados (los demás dicen "Ya elegido"), y el servidor crea la cuenta invitada
  en segundo plano. Quien ya tiene sesión en otro celular entra directo.
- Toda llamada al servidor lleva el token de la sesión. Sin sesión (401), los
  envíos de partidas quedan pendientes.
- Probado con dos celulares reales: A se registra y crea el grupo; B entra sin
  cuenta, elige a Pedro y lo renombra; B registra una partida y A la ve; B no puede
  renombrar al administrador (403) ni ver partidas sin sesión (401).

Conceptos nuevos:

- `localStorage` para la sesión y `useSyncExternalStore`: el hook `useSession`
  se suscribe a los cambios de la sesión, así el menú se actualiza solo al
  iniciar o cerrar sesión.
- Diálogos de mensaje: `Dialog` acepta `closeButton` para mostrar una X arriba a
  la derecha en lugar de botones (la ayuda del correo). La búsqueda del historial
  también tiene su X a la derecha del campo.
- Encabezado `Authorization: Bearer <token>` agregado en un único lugar
  (`apiRequest`), para que ninguna llamada se olvide de él.
- Redirigir con "a dónde volver": `navigate('/registrarse', { state: { from } })`.

## Etapa 26 — Cancelar y restaurar partidas

Hecho:

- Una partida cancelada no se borra: queda en el historial tachada, con la marca
  "Cancelada" y el motivo si lo hay, y deja de contar para los puntos y las
  estadísticas.
- Cada partida con permiso muestra un botón "⋯" con "Cancelar partida" o
  "Restaurar partida". Si no tienes permiso, el botón no aparece. El
  administrador puede siempre; quien registró la partida (si no es
  administrador) tiene 1 hora para cancelarla, y quien canceló tiene 1 hora para
  restaurar. El plazo corre desde que el *servidor* recibe la partida, no desde
  la hora que informa el celular, para que no se pueda adelantar el reloj.
- Al cancelar se puede escribir un motivo (opcional). Se necesita conexión.
- Servidor: `POST .../partidas/<id>/cancelar` y `.../restaurar`, migración 0004
  (estado en la partida y una tabla `match_events` con cada cancelación y
  restauración). Las partidas ahora informan quién las registró.
- Los otros celulares se enteran al abrir el grupo.
- Probado con dos celulares: B (quien registró la partida) la cancela con motivo;
  A (administrador) la ve cancelada, con sus puntos en 0, y la restaura; B ve que
  volvió a contar.

Conceptos nuevos:

- Borrado lógico (`soft delete`): en lugar de borrar la fila, se la marca. Así hay
  rastro y se puede deshacer. Es lo que impide que alguien oculte partidas.
- Registro de auditoría (`audit log`): tabla donde solo se agregan eventos
  (quién, qué y cuándo); nunca se editan.
- Permisos por fila: el botón aparece solo si la persona puede usarlo, y el
  servidor lo vuelve a comprobar (la app nunca es la única barrera).
- Menú desplegable por fila (`OverflowMenu`): reutilizable, se cierra al elegir,
  tocar afuera o con Escape.

## Etapa 27 — Nuevo diseño del home y del historial

Hecho:

- Home: los grupos pasan de tarjetas a filas. El nombre va primero y grande;
  debajo las cantidades, los avatares ordenados por ranking y la última
  partida; a la derecha, tu posición (trofeo dorado, plateado o de bronce para
  el 1º, 2º y 3º; solo el número del 4º en adelante) y tus puntos en tamaño
  menor. La nube de "sin enviar" aparece junto al nombre.
- Historial: partidas agrupadas por día (Hoy, Ayer, fecha corta); cada equipo en
  su línea con avatares y puntaje, el ganador en negrita; una barra al costado
  (llena si ganaste, hueca si perdiste, gris si no jugaste) y los puntos que
  sumaste o restaste (+12 Pts, −8 Pts).
- El diseño se eligió mirando una maqueta HTML con los colores y componentes
  reales antes de escribir código.

Conceptos nuevos:

- Maqueta antes de implementar: una página HTML estática con los mismos tokens
  del diseño permite comparar opciones sin tocar la app.
- Tokens de color (`--trophy-gold`, `--trophy-silver`, `--trophy-bronze`): los
  colores nuevos se declaran una vez en `index.css` y se reutilizan.
- Funciones de resumen puras (`groupOverview`, `pointChanges`): el cálculo del
  ranking, la última partida y los cambios de puntos está separado de la
  pantalla, así se prueba sin dibujar nada.
- Un solo recorrido para los puntos por partida: `pointChanges` reutiliza la
  misma regla que `computePoints` y guarda cuánto cambió en cada paso, en lugar
  de recalcular todo el historial para cada partida.

### Ajuste de la etapa 27: recuperar el peso visual

Al probarlo, el diseño en crema y gris había perdido el contraste que caracteriza
a la app (fondos negros con letra crema). Se corrigió:

- Home: cada grupo empieza con una banda negra con el nombre y la posición. Los
  avatares son los 8 primeros del ranking, sin contador de "+N".
- Historial: los títulos de día son bandas negras; cada puntaje va en un cuadro
  negro (los dos); la barra del costado es siempre negra.
- Menú del home: sin cuenta registrada muestra Registrarse, Iniciar sesión y Ver
  perfil (sin "Crear grupo", que exige cuenta); con sesión, Crear grupo, Ver
  perfil y Cerrar sesión.
- Lección: el diseño de una app no es solo la distribución; el contraste entre
  zonas claras y oscuras es parte de su identidad y hay que mantenerlo.

### Limpieza de calidad

- Se resolvieron los 4 problemas de lint que arrastrábamos: bloques `catch`
  vacíos (ahora explican por qué se ignora el error), una dependencia sobrante
  en un `useCallback` y un `setState` dentro de un efecto en el aviso de puntos
  (ahora el valor se lee al crear el estado y el efecto solo lo borra y programa
  su desaparición).
- Prettier: `endOfLine: "auto"` acepta saltos de línea de Windows y de Linux, así
  `prettier --check .` pasa en cualquier máquina.
- Concepto: `eslint` encuentra errores de lógica y malas prácticas; `prettier`
  solo da formato. Tenerlos en cero evita que la deuda se acumule.

### Segundo ajuste de la etapa 27

- Historial: los dos puntajes forman un solo bloque negro del alto de la partida,
  con una línea crema en el medio, en lugar de dos cuadros sueltos.
- Home: los grupos vuelven a ser tarjetas con margen y borde redondeado, para que
  se note que son botones; la banda negra con el nombre se mantiene.
- Lección: un elemento tocable necesita señales de que lo es (margen, borde,
  forma de botón); ocupar todo el ancho lo hace parecer una fila de lista.

### Tercer ajuste de la etapa 27

- Home: la banda negra de cada grupo tiene una flecha ">" a la derecha, junto a la
  posición, para indicar que es un botón. La nube de "sin enviar" pasó a la línea
  de integrantes y partidas, alineada a la derecha. La última partida ahora dice
  cuándo fue ("Última partida: ayer 21:30") en lugar de quién ganó.

### Cuarto ajuste de la etapa 27: historial alineado

- Los datos de la partida ("2v2", "30 pts", "26 min", "Sin enviar") y los puntos
  que sumaste o restaste pasaron a un bloque negro vertical a la izquierda. Así la
  partida tiene solo dos líneas (una por equipo) y cada puntaje, a la derecha,
  queda a la altura de su equipo.
- Técnica: tres columnas con `align-items: stretch` y los equipos y las celdas de
  puntaje con `flex: 1`, para que se repartan el alto en partes iguales.

## Etapa 28 — Rediseño de las demás pantallas

Hecho (las pantallas que no son el home ni el historial):

- Secciones de formularios, estadísticas y perfil: tarjetas con margen y banda
  negra de título (un cambio en el componente compartido `Section`).
- Participantes: sin estadísticas; solo botones con avatar, nombre y un bloque negro
  con ">" a la derecha.
- Ficha del participante y Perfil: cifras principales en bloques negros con
  número grande (componente `Figure`, ahora negro, y `Figures` que los reparte).
- Estadísticas: pestañas en un solo control con margen, podio con todos los
  escalones negros apoyados en su tarjeta, totales en bloques negros, récords de
  partidas con el bloque de puntajes del historial y posiciones del ranking en
  cuadros negros.
- Iniciar partida: avatares y nombres más grandes en cada integrante.
- Las reglas de diseño quedaron escritas en requisitos §12.11.

Conceptos nuevos:

- Un componente compartido (`Section`, `Figure`) permite cambiar el aspecto de
  muchas pantallas a la vez; por eso conviene reutilizarlos en lugar de repetir
  estilos.
- Reglas de diseño por escrito: así los cambios futuros mantienen la identidad
  sin tener que volver a discutirla.

## Etapa 29 — Historial más legible y estadísticas con secciones a ancho completo

Hecho:

- Historial: fila plana con barra vertical negra a la izquierda. Los datos
  (modalidad, objetivo, duración, puntos y menú) van en una línea arriba; un
  recuadro con contorno une a los equipos con el bloque negro de puntajes;
  "Sin enviar" y "Cancelada" van debajo.
- Estadísticas: pestañas y secciones de borde a borde, separadas de la barra
  superior por una línea crema; los totales son bloques con margen.
- Partidas (récords): la duración o diferencia va grande a la derecha del título.

Conceptos nuevos:

- Cuando una pantalla necesita una variante de un componente compartido (la
  sección de borde a borde), se resuelve con un selector en el contenedor
  (`.contentFlush .section`) en vez de duplicar el componente.
- Al rediseñar, se cambia solo lo que se pidió: lo que ya gustó se conserva.

## Etapa 30 — Revisión de diseño de toda la app

Se recorrieron todas las pantallas con capturas y se corrigió lo que rompía la
coherencia:

- Enfrentamientos: la fila negra de avatares se pegaba a la barra negra de
  pestañas; ahora hay aire entre ambas.
- Avisos (`Notice`): esquinas redondeadas como el resto de las tarjetas; en
  "Unirse a un grupo" tenían un margen doble.
- Ficha del participante: avatar y porcentaje centrados (quedaba un hueco).
- Récords de partidas: cada equipo queda a la altura de su celda de puntaje.

Concepto nuevo: una revisión visual global (capturas de cada pantalla en el
mismo tamaño) detecta inconsistencias que no se ven mirando una pantalla sola,
como dos zonas negras que se tocan.

Ajuste de grosores de línea: se definió una jerarquía de tres niveles (3 px
divisiones estructurales entre zonas negras, 2 px contornos, 1 px divisiones
finas internas; ver requisitos §12.11). Las divisiones de la grilla de
enfrentamientos volvieron a ser finas, y la línea entre puntajes pasó a 1 px
para igualar la que divide a los equipos.

Récords de partidas: ahora reutilizan la tarjeta del historial (`HistoryRow` con la
opción `compact`), sin modalidad ni objetivo y con duración, hora y "Sin enviar"
en la línea de arriba. Reutilizar el mismo componente evita que las dos
pantallas se desalineen con el tiempo.

Ajustes finales de esta pasada:

- Historial: la tarjeta va arriba y los datos (hora, duración, puntos, menú,
  sin enviar) debajo; se quitó la línea de modalidad y objetivo.
- Récords de partidas: título y dato con la misma letra; la tarjeta con la
  fecha debajo.
- Grilla de enfrentamientos: las líneas se veían cortadas y desfasadas porque
  la tabla usaba bordes "colapsados" con filas de alto fraccionario. Ahora cada
  celda dibuja solo su línea derecha y su línea de abajo (siempre 1 px) y las
  alturas son fijas, así las líneas llegan de borde a borde y quedan alineadas.

## Etapa 31 — Administración del grupo (varios administradores)

Hecho:

- **Varios administradores:** el rol deja de ser un único `admin_member_id` en el
  grupo y pasa a ser una marca (`is_admin`) en cada integrante (migración
  `0005_administradores.sql`, que marca como administrador al creador de cada grupo
  existente). La app usa `adminMemberIds` (lista); los grupos guardados con el
  formato viejo se convierten al leerlos.
- **Acciones del servidor** (solo administradores, archivo `worker/admin.ts`):
  agregar integrante, dar de baja (se oculta, sus partidas se conservan), liberar
  (desvincula la cuenta) y dar o quitar el rol de administrador.
- **Traspaso automático:** si el grupo se queda sin administradores, el rol pasa
  solo al integrante con cuenta más antiguo.
- **En la app:** menú "⋯" en cada tarjeta de Participantes (solo para
  administradores), escudo junto a los administradores y "Agregar integrante" en el
  menú de tres rayas del grupo.

Conceptos nuevos:

- **Migración que transforma datos:** además de agregar la columna, la migración
  hace un `UPDATE` para que lo que ya existía siga funcionando.
- **Compatibilidad de formatos:** la app convierte los datos guardados con el
  formato anterior al leerlos, así nadie pierde sus grupos al actualizar.
- **Dejar de depender de un dato viejo:** `groups.admin_member_id` queda como dato
  histórico (el creador); los permisos salen de `members.is_admin`.

## Etapa 32 — Salir del grupo avisa al servidor

Hecho:

- Nuevo pedido `POST /api/grupos/:código/salir` (`worker/leave.ts`): el integrante
  queda libre (otra persona puede elegirlo) y conserva sus partidas; si era
  administrador pierde el rol y, si el grupo se queda sin administradores, pasa solo
  a otro (traspaso automático). Si era el único integrante, el grupo se elimina.
- En la app, "Salir del grupo" primero avisa al servidor. Sin conexión no se sale
  (para no dejar al integrante vinculado a una cuenta que ya se fue); si el servidor
  ya no reconoce a la persona (401/403/404), se sale igual.

Concepto nuevo: **orden de operaciones entre servidor y celular**. Primero se
confirma en el servidor y recién después se cambia lo local; así los dos lados no
quedan contradiciéndose si falla la conexión.

## Etapa 33 — Aviso de sesión vencida y usuario en el menú

Hecho:

- Cuando el servidor responde 401 a un pedido que llevaba un token guardado (salvo
  en iniciar sesión o registrarse, donde un 401 es "contraseña incorrecta"), la
  app recuerda que la sesión venció. La pantalla principal muestra el aviso con un
  botón para iniciar sesión; se borra al iniciar sesión de nuevo.
- El menú de tres rayas muestra con qué usuario se inició sesión en su primera
  línea ("Invitado" si es una cuenta invitada).

Concepto nuevo: **un mismo código de error con significados distintos**. Un 401
puede ser "no hay sesión válida" o "credenciales incorrectas"; por eso el aviso solo
se activa cuando había un token y el pedido no era de inicio de sesión.

## Etapa 34 — Historial de cada partida

Hecho:

- Nuevo pedido `GET /api/grupos/:código/partidas/:id/historial` (`worker/history.ts`):
  devuelve cuándo y quién registró la partida y cada cancelación o restauración
  (quién, cuándo y motivo), leyendo la tabla `match_events`. Cualquier integrante del
  grupo lo puede ver.
- En la app, el menú "⋯" de cada partida enviada ofrece "Ver historial", que abre
  una ventana con esa lista.

Concepto nuevo: **tabla de eventos (auditoría)**. En vez de guardar solo el estado
actual, se guarda cada cambio; así se puede reconstruir qué pasó y nadie puede
ocultar una acción.

## Etapa 35 — Jugadores invitados y apodos

Hecho:

- **Invitados:** una partida de grupo puede incluir personas que no son del grupo
  (se anotan solo con su nombre), con al menos un integrante por equipo. Se agregan
  en "Iniciar partida" con "Agregar jugador". La partida guarda a cada jugador con
  una marca `guest` (migración `0006_invitados_y_apodos.sql`, columna
  `match_players.is_guest`). Los invitados no suman ni restan puntos.
- **Apodos:** cada integrante puede tener apodos (tabla `member_aliases`, único por
  grupo). Un invitado cuyo nombre es un apodo de un integrante cuenta como ese
  integrante, también en partidas anteriores. Se editan en la ficha (el propio
  integrante o un administrador) y se piden al unirse al grupo.
- **Dónde se aplica:** `forStats` (`src/features/matches/guests.ts`) convierte las
  partidas antes de calcular puntos y estadísticas: reemplaza a los invitados con
  apodo por el integrante y quita a los demás. El historial muestra a todos con el
  nombre que se les puso.

Conceptos nuevos:

- **Vincular datos por nombre:** los apodos no cambian lo que se guardó en cada
  partida; se aplican al leer. Así, quitar un apodo deja las partidas como estaban
  antes (sin integrante vinculado) sin tocar nada guardado.
- **Normalizar para comparar:** nombres en minúsculas y sin tildes, para que
  "Juancho" y "JUANCHÓ" sean el mismo apodo.

## Etapa 36 — Partida en vivo

Hecho:

- **Servidor** (`worker/live.ts`, migración `0007_partida_en_vivo.sql`): una fila por
  partida en vivo (con su propio id), así puede haber varias a la vez en un grupo.
  Pedidos: `PUT` y `DELETE` en `/api/grupos/:código/en-vivo/:id` (publicar y
  terminar) y `GET` en `/api/grupos/:código/en-vivo` (lista), solo para integrantes.
  La lista deja afuera las que nadie actualiza hace 5 minutos.
- **Contador** (`useLiveBroadcast`): publica cada cambio (con una espera corta para
  juntar toques seguidos) y cada 20 segundos; al salir del contador la borra. No hace
  nada en la partida rápida ni sin sesión o conexión.
- **Mirar** (`useLiveMatch`, `LiveMatchScreen`): la pantalla del grupo muestra una
  tarjeta "En vivo" por partida (menos la propia); al tocarla se ve el mismo dibujo
  del contador, sin botones, actualizado cada 3 segundos.

Conceptos nuevos:

- **Polling (consulta periódica):** el celular que mira le pregunta al servidor cada
  pocos segundos. Es más simple y gratis que mantener una conexión abierta
  (WebSocket), y alcanza para un marcador.
- **Latido (heartbeat):** quien cuenta vuelve a publicar cada tanto aunque no cambien
  los puntos; así el servidor sabe que la partida sigue viva y, si deja de llegar, la
  descarta sola.
- **Reutilizar un componente con un tipo más chico:** el dibujo del contador pidió solo
  `target`, `started` y `points`, así sirve igual para mirar una partida en vivo.

## Etapa 37 — Ajustes: escudo, renombrar integrantes y cancelar sin conexión

Hecho:

- **Escudo de administrador:** ahora es de contorno con una tilde adentro (antes era
  todo negro y no se entendía).
- **Cambiar el nombre:** en la ficha, cada integrante cambia el suyo y un administrador
  cambia el de quien nadie eligió todavía (el servidor lo comprueba: si el integrante
  ya tiene cuenta vinculada, solo él puede).
- **Cancelar sin conexión:** una partida que todavía no se envió se cancela (y se
  restaura) en el celular; al sincronizar, primero se envía y después se cancela en
  el servidor, así llega ya cancelada. Si se corta la conexión entre los dos pasos,
  sigue pendiente y se reintenta. Las partidas ya enviadas siguen necesitando conexión.

Concepto nuevo: **operaciones en dos pasos con reintento seguro.** Enviar la partida
es idempotente (repetirlo no la duplica), así que si falla el segundo paso se puede
volver a empezar desde el primero sin riesgo.

## Etapa 38 — Cambiar nombre y apodos desde el menú de Participantes

Hecho:

- "Cambiar nombre" y "Editar apodos" pasan al menú "⋯" de cada tarjeta en Participantes
  (cada uno ve las de su tarjeta; los administradores, las de todas; el nombre de
  alguien que ya eligió su lugar solo lo cambia él). Antes estaban abajo en la ficha y
  no se encontraban.
- En la ficha, la sección "Apodos" solo aparece si el integrante tiene apodos.
- Al sincronizar el grupo, si el celular no tenía guardado qué integrante es la persona
  (grupos anteriores a las cuentas), se completa con lo que dice el servidor; así se
  habilitan las opciones de administrador.

Concepto nuevo: **descubribilidad.** Una función que existe pero está escondida no
sirve; conviene ponerla donde la persona ya está mirando (la lista de integrantes).

## Etapa 39 — Usuarios de 1 o 2 caracteres

Hecho: el nombre de usuario ahora puede tener de 1 a 20 caracteres (antes, de 3 a 20).
Solo cambió la validación del servidor (`worker/users.ts`); la app no limitaba el
largo. Los usuarios ya registrados no se ven afectados.

## Etapa 40 — Grupos creados antes de las cuentas

Hecho:

- **Grupo solo en el celular** (sin código de invitación): su administrador pasa a
  ser la persona de este celular al leerlo, así aparece como integrante (puntos,
  ranking). Al invitar, el servidor lo vincula como administrador.
- **Grupo ya en el servidor pero sin nadie vinculado:** la pantalla del grupo pregunta
  "¿Cuál de los integrantes eres?" a quien tiene cuenta registrada. Nuevo pedido
  `POST /api/grupos/:código/reclamar` (`worker/claim.ts`): vincula a esa persona y la
  hace administradora, solo mientras el grupo no tenga a nadie vinculado.

Concepto nuevo: **migrar datos viejos sin perderlos.** En vez de borrar o ignorar los
grupos anteriores, se agregó un camino para vincularlos a una cuenta, con una regla
estricta (solo si nadie está vinculado) para que no se pueda usar para "robar" un lugar.

## Etapa 41 — El usuario del menú abre el perfil

Hecho: con sesión iniciada, la primera línea del menú (el usuario o "Invitado") pasa
a ser un enlace en letra crema que abre el perfil, y se quita la opción "Ver perfil".
Sin sesión se mantiene "Ver perfil". El componente `HeaderMenu` recibió `headingTo`
para que esa primera línea pueda ser un enlace.

## Etapa 42 — Puntos con meseta, foto por toque y "Eliminar del grupo"

Hecho:

- **Nuevo sistema de puntos** (`src/features/matches/points.ts`; reglas y constantes en
  requisitos §6.4): todos empiezan en 0 y cada integrante suma o resta según sus
  propios puntos (muchísimo al ganar y casi nada al perder cuando tiene pocos; parejo en
  1500; las derrotas pesan hasta el doble de las victorias arriba de 2250). Así sube
  rápido al principio y se acomoda en una meseta que depende de cuánto gana (1500 para
  un jugador parejo). Se definió preguntando a quien lo usa y simulando miles de
  partidas con el código real. Reemplaza al sistema anterior (puntos que subían sin
  límite) y a una primera versión tipo Elo que arrancaba en 1200.
- **Foto:** el botón "Elige foto" de la ficha se quitó. Ahora se toca la foto (con una
  insignia de lápiz) y se abre "Editar foto". El perfil propio también tiene foto
  editable, que se aplica en todos los grupos donde se sabe quién eres.
- "Dar de baja" pasa a llamarse "Eliminar del grupo".

Conceptos nuevos:

- **Meseta (punto de equilibrio):** como cada jugador suma y resta según sus propios
  puntos, hay un nivel en el que ganar y perder se compensan para su porcentaje de
  victorias; ahí se acomoda. No hace falta que los puntos sumen cero.
- **Simular antes de cambiar:** antes de decidir los números se simularon miles de
  partidas con el código real para ver a dónde convergen los puntos.

## Etapa 43 — Puntos desde 0 con meseta

Se rehízo el sistema de puntos con las reglas definidas junto con quien lo usa: todos
empiezan en 0; un jugador parejo se acomoda cerca de 1500; se sube rápido al principio;
ganar siempre suma algo claro aunque se esté arriba (nunca hacen falta más de dos
victorias para compensar una derrota); una victoria típica en la meseta suma unos 30;
se mantienen los ajustes por objetivo y por diferencia de resultado, y no hay bonus
fijo por jugar (jugar ya premia porque se sube desde 0). Detalle, constantes y tabla de
ejemplos en requisitos §6.4.

Concepto nuevo: **definir reglas preguntando.** Antes de programar se fijaron, una por
una, las decisiones que cambian los números (meseta, asimetría arriba, tamaño de una
partida, constancia, ajustes) y se comprobaron con simulaciones.

## Etapa 44 — Vínculo cuenta ↔ integrante y sincronización entre celulares

Problemas vistos probando con dos celulares y su causa:

- **Las partidas no se veían entre celulares ni funcionaba la partida en vivo:** la cuenta
  de quien creó el grupo antes de las cuentas no estaba vinculada a ningún integrante en
  el servidor; sin ese vínculo el servidor rechaza (403) enviar, recibir y transmitir, y la
  app lo ignoraba en silencio. Si otra persona se unía con el enlace antes de que el
  creador reclamara su lugar, además, ya no podía reclamarlo.
- **Arreglo:** al abrir un grupo la app comprueba que el servidor sepa quién es la cuenta
  y, si no, pregunta (con un aviso visible si se cierra la pregunta). El servidor permite
  reclamar mientras no haya un administrador vinculado, aunque otros ya se hayan unido.
- **Sincronización:** el grupo abierto se sincroniza cada 10 segundos y al volver a la app.
- **Salir del grupo** ahora quita el grupo del celular; entrar de nuevo con el enlace vuelve
  a pedir elegir integrante y apodos (antes entraba directo porque la copia local seguía).
- **Volver atrás desde el contador** lleva al grupo (la pantalla de armar la partida se
  reemplaza en el historial de navegación).

Concepto nuevo: **fallos silenciosos.** Una operación que falla sin avisar es peor que una
que falla con un mensaje; cuando algo depende de un vínculo, conviene comprobarlo y
mostrarlo.

Agregado en la misma etapa: **el enlace de invitación pide una cuenta.** Sin sesión, la pantalla
de unirse muestra "Necesitas una cuenta" con "Registrarse" e "Iniciar sesión" (vuelven al
enlace al terminar) y, discreto, "Seguir sin cuenta". Se vio probando que quien entraba sin
cuenta no sabía que le faltaba y no se sincronizaba como esperaba.

## Etapa 45 — Que los fallos de sincronización se vean

Después de probar con dos celulares seguía sin verse lo que hacía el otro. Cambios:

- **`pullGroup` ya no se rinde entero:** pedía el grupo y las partidas juntos, y si las
  partidas fallaban (por ejemplo, un 403 por no estar vinculado) tampoco se actualizaban
  las fotos ni los nombres. Ahora se piden por separado (`Promise.allSettled`).
- **La foto propia que no llegó se reintenta** y no la pisa lo que diga el servidor.
  Cambiar la foto avisa si no se pudo compartir y por qué.
- **El envío de partidas explica sus fallos:** la pantalla del grupo muestra el motivo
  (sin sesión, cuenta sin vincular, servidor caído, sin conexión) con "Reintentar".

Concepto nuevo: **`Promise.allSettled`.** Espera a que terminen todas las promesas, salgan
bien o mal, y deja decidir qué hacer con cada resultado; `Promise.all` se rinde con la
primera que falla.

## Etapa 46 — Pausa simple y pausa automática del cronómetro

- **Pausar solo detiene el tiempo.** Se quitó el cartel "Partida pausada" y el bloqueo: se puede seguir sumando y navegando. Sumar puntos reanuda el cronómetro; deshacer no.
- **Pausa automática a los 60 segundos.** Mientras el contador está abierto guarda cada 10 segundos "última vez activo" (`lastActiveAt`), y también al ocultarse la app. Al volver a abrir, `settleTimer` compara: si pasó más de un minuto con el cronómetro corriendo, lo deja pausado en ese instante límite, así no se cuentan 45 minutos de una partida abandonada.
- **Por qué un latido y no un temporizador:** si la app se cierra, el navegador ya no ejecuta código; por eso se guarda la última marca y se decide al reabrir.

## Etapa 47 — El enlace de invitación ya no se salta la elección

- **El error:** al abrir el enlace, si el grupo ya estaba guardado en el celular, la app entraba directo. Pero ese grupo podía ser de una sesión anterior (o de antes de tener cuenta): sin cuenta vinculada el servidor rechaza enviar y recibir partidas, y el grupo ni aparecía en el inicio.
- **La regla ahora:** se entra directo solo si el servidor confirma quién es esta cuenta. Si no hay sesión se pide registrarse o iniciar sesión; si hay sesión pero sin vínculo, se elige el integrante. Concepto: la fuente de verdad es el servidor, no lo que quedó guardado en el celular.

## Etapa 48 — Cerrar sesión limpia el celular

- **El error:** al cerrar sesión seguían los grupos de la cuenta anterior en el celular. Los datos del grupo (IndexedDB) son de la cuenta, no del aparato: ahora `clearAccountData` los borra al cerrar sesión (y avisa si hay partidas sin enviar).
- **Recuperarlos:** el servidor tiene un endpoint nuevo `GET /api/mis-grupos`; al iniciar sesión la app lo usa para volver a bajar los grupos de la cuenta.
- **Versión vieja:** una PWA abierta en segundo plano puede seguir con código viejo. Al volver a verla compara el archivo principal con el publicado y se recarga si cambió.
- **Lugar "Ya elegido":** si tu integrante lo eligió otra cuenta (por ejemplo, una que creaste antes), el servidor no deja tomarlo. Ahora se explica qué hacer: iniciar sesión con esa cuenta o pedir al administrador que lo libere.

## Etapa 49 — Invitado que inicia sesión, y qué versión corre

- **El hueco:** quien se unía como invitado (cuenta invitada, dueña de su lugar) y después iniciaba sesión con una cuenta que ya tenía quedaba con el lugar "huérfano": el servidor lo veía tomado por otra cuenta y la persona no podía vincularse ni enviar partidas. Registrarse ya convertía la invitada en la cuenta; iniciar sesión no. Ahora `login` pasa los lugares y partidas de la invitada a la cuenta.
- **Los tres puntitos de un nombre sin vínculo:** salían porque el celular recordaba "yo soy este integrante" de otra sesión. Con sesión iniciada manda el servidor (fuente de verdad), así que ese dato viejo se descarta.
- **Probar de verdad:** esta vez se reprodujo el flujo con un servidor local y un Chrome real (enlace sin sesión, registro, unirse, cerrar sesión, volver al enlace, iniciar sesión, invitado que inicia sesión). Los tests de unidad no lo habían detectado.
- **Versión visible:** se muestra la fecha de compilación al pie de la pantalla principal (Vite la inyecta con `define`), para distinguir "no se arregló" de "el celular tiene la app vieja".
