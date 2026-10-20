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
