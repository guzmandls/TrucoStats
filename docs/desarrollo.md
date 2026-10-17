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
