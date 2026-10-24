# trucoStats — Desarrollo

Mi diario de aprendizaje: cómo armé trucoStats, qué tecnologías usé, los conceptos nuevos que aparecieron y las decisiones importantes. Está ordenado por tema; los detalles de cada funcionalidad están en `requisitos.md`.

## La app en pocas palabras

- Contador de truco con el sistema de cuadrados (botones N y E, deshacer, cronómetro con pausa).
- Partidas rápidas (solo en el celular) y partidas de grupo (compartidas entre celulares).
- Grupos con integrantes, administradores, invitados, apodos, fotos e invitación por enlace.
- Historial con búsqueda, cancelación y restauración, y el historial de cambios de cada partida.
- Estadísticas del grupo (podio, récords, ranking por puntos, enfrentamientos) y perfil personal.
- Partidas en vivo: el resto del grupo mira el marcador mientras se juega.
- Cuentas con usuario y contraseña, recuperación por correo y sesión en varios celulares.
- Se instala desde el navegador (iPhone y Android) y funciona sin conexión.

**Cómo está armada**

```
src/            la app (React + TypeScript)
  features/     una carpeta por funcionalidad: counter, groups, matches, auth, profile, install
  components/   componentes compartidos (ui.tsx) e íconos
  lib/          cliente de la API y sesión
  index.css     sistema de diseño (colores, espacios, letras, grosores)
worker/         el servidor (Cloudflare Worker): la API /api/...
migrations/     cambios de la base de datos D1, numerados
public/         service worker, manifiesto e íconos
docs/           requisitos, este diario y pendientes
```

## Cronología

1. **Base del proyecto y contador:** Vite + React + TypeScript, pruebas y formato; el contador con los cuadrados.
2. **Guardado local y PWA:** la partida en curso se guarda en el celular; la app funciona sin internet y se puede instalar.
3. **Publicación en Cloudflare:** la app en `trucostats.guzmandls.workers.dev`.
4. **Grupos, partidas y estadísticas:** todo en el celular (IndexedDB).
5. **Backend:** un Worker con la API y una base de datos D1.
6. **Sincronización:** las partidas viajan entre celulares.
7. **Cuentas:** usuario y contraseña, cuentas invitadas, permisos.
8. **Administración:** varios administradores, cancelar y restaurar partidas, historial de cambios.
9. **Partidas en vivo.**
10. **Recuperación de contraseña por correo.**
11. **Rendimiento:** el Worker junto a la base y actualizaciones con versión (304).
12. **App instalada:** pantalla completa, barras fijas, ícono propio, instalación fácil.
13. **Gestión de la cuenta:** nombre del grupo, usuario, contraseña, eliminar cuenta.

## Herramientas y entorno

- **React:** librería para armar la interfaz con piezas reutilizables (**componentes**). **JSX** es la forma de escribir HTML dentro del código.
- **TypeScript:** JavaScript con tipos; avisa errores antes de ejecutar.
- **Vite:** levanta el entorno de desarrollo y arma la versión final (**build**, carpeta `dist`). Con `define` inyecta datos al compilar (la fecha de la versión que se ve al pie del inicio). Su **proxy** de desarrollo reenvía `/api` al Worker local, así la app y el servidor parecen un solo sitio, igual que en producción.
- **CSS Modules:** estilos propios de cada componente, sin choques de nombres.
- **npm y `package.json`:** dependencias y comandos (`npm run dev`, `build`, `test`, `deploy`, `icons`). Una **dependencia de desarrollo** (por ejemplo `@cloudflare/workers-types`) solo sirve para programar y no viaja en la app publicada.
- **ESLint** encuentra errores y malas prácticas; **Prettier** solo da formato. Los mantengo en cero para que la deuda no se acumule.
- **Git y GitHub:** una rama por funcionalidad → pull request → merge → borrar la rama. Antes de cada merge corro las pruebas, ESLint y Prettier.

## React

- **Estado (state):** datos que cambian mientras se usa la app; al cambiar, la pantalla se vuelve a dibujar sola (**render**).
- **Props:** datos que un componente le pasa a otro.
- **Hooks:** funciones que le dan capacidades a un componente.
  - `useState` guarda un valor que cambia; `useReducer` maneja estados complejos con **acciones** y un **reducer** que decide el estado siguiente (el contador: "sumar", "deshacer").
  - `useEffect` ejecuta algo después de dibujar; sus **dependencias** deciden cuándo se repite.
  - `useRef` guarda un valor entre dibujados sin provocar uno nuevo.
  - `useSyncExternalStore` suscribe un componente a algo que vive fuera de React (la sesión, el aviso de instalación).
  - **Hooks propios** (`useCounter`, `useGroup`, `useLiveMatch`) juntan estado y lógica para que las pantallas solo dibujen.
- **Router (react-router-dom):** asocia direcciones con pantallas (`/grupo/:id`). En una **SPA** no se recarga la página: cambia solo lo que se ve. `:id` es un **parámetro de ruta**.
- **Lógica separada de las pantallas:** cálculos y almacenamiento viven en archivos aparte, como **funciones puras** (reciben datos y devuelven resultados), así se prueban sin dibujar nada. Las estadísticas y los puntos se **calculan** desde las partidas en vez de guardarse, así siempre coinciden con el historial.
- **Ajustar el estado durante el render:** comparar el valor nuevo con el anterior y actualizar en el mismo dibujado, en vez de un efecto. Lo usé para animar solo el trazo recién sumado del contador.

## Diseño e interfaz

- **Tokens de diseño:** colores, espacios, tamaños de letra y grosores con nombre (variables CSS como `--space-4` o `--text-md`) en `index.css`. Todo estilo sale de ahí, así la app es coherente y se cambia desde un solo lugar. Usar `var(--algo)` sin definirlo invalida la propiedad en silencio.
- **Componentes compartidos** (`Section`, `Figure`, `Dialog`, `Notice`, `HistoryRow`): cambiar uno cambia muchas pantallas a la vez; por eso prefiero reutilizarlos antes que copiar estilos.
- **Accesibilidad:** contraste mínimo 4,5:1 entre texto y fondo (guía WCAG); zonas táctiles de al menos 44 px; `aria-label` y roles (`dialog`, `radiogroup`) para lectores de pantalla.
- **SVG:** dibujo vectorial. Los cuadrados del contador son `<path>` con `pathLength="1"`, así una misma animación (`stroke-dasharray` + `stroke-dashoffset`) dibuja trazos de cualquier largo. `prefers-reduced-motion` respeta "reducir movimiento".
- **CSS que aprendí en el camino:**
  - Selector de hijos directos (`.a > .b`) para que una regla no alcance a elementos anidados.
  - En una columna flexible que se desplaza, los hijos con `overflow: hidden` se achican; `flex-shrink: 0` lo evita, y el contenedor necesita `min-height: 0`.
  - `IntersectionObserver` avisa cuando un elemento entra en pantalla: lo uso para el **scroll infinito** del historial.
  - `normalize('NFD')` separa las letras de sus tildes, para buscar sin importar acentos.
  - **Canvas** para achicar fotos y **data URL** para guardar una imagen como texto.
- **App instalada a pantalla completa:**
  - `viewport-fit=cover` y la barra de estado `black-translucent` hacen que la app se dibuje también debajo de la hora; `env(safe-area-inset-top/bottom)` da el tamaño de esas zonas.
  - En el iPhone instalado, alturas como `100vh` o `100svh` pueden medir menos que la pantalla (error conocido de WebKit). Por eso armé un **marco de app**: `#root` fijo, anclado debajo de la hora y hasta el borde de abajo.
  - Cada pantalla es cabecera + contenido + barra inferior, y solo el contenido se desplaza; `overscroll-behavior` evita que el rebote arrastre la pantalla.
  - Sin barras de desplazamiento visibles y sin selección de texto al mantener apretado (`user-select: none`).
- **Decisiones:**
  - Preferí un estilo de cuadernola, negro y crema, con bandas negras de título y una jerarquía fija de grosores de línea (3, 2 y 1 px).
  - Los textos dicen "Eliminar" (nunca "Quitar") y no usan palabras de duda.
  - El perfil muestra solo estadísticas; todo lo que se edita está en "Editar perfil".

## Datos en el celular

- **IndexedDB:** base de datos dentro del navegador, para objetos grandes: grupos, partidas y la partida en curso.
  - Cada "tabla" es un **almacén de objetos** (object store) con su **keyPath** (el campo que sirve de id).
  - Al subir la **versión** de la base, `onupgradeneeded` crea o borra almacenes sin perder lo demás.
  - En las pruebas, `fake-indexeddb` la simula.
- **localStorage:** para datos chicos y simples (la sesión, preferencias).
- **Persistencia e hidratación:** guardar para recuperar después y, al abrir, rellenar la app con lo guardado. La partida en curso se guarda por **ranura** (una para la partida rápida y una por grupo), así no se pisan.
- **Migrar formatos viejos al leerlos:** cuando cambió cómo se guarda algo (varios administradores, ranuras), la app convierte lo viejo al leerlo, para que nadie pierda datos al actualizar.
- **Offline-first:** lo del celular manda; el servidor es una copia que se actualiza cuando hay conexión.

## PWA y service worker

- **PWA:** una web que se instala como app y funciona sin internet.
- **Manifiesto** (`manifest.webmanifest`): nombre, íconos y colores de la app instalada. El color de fondo es el negro de la pantalla de inicio, así Android no muestra otro color al abrirla.
- **Service worker** (`public/sw.js`): programa en segundo plano que guarda en **caché** los archivos de la app para usarla sin conexión. Solo funciona en HTTPS o en localhost (**contexto seguro**).
  - Los archivos con **huella en el nombre** (`index-abc123.js`) se pueden guardar para siempre. Los que no la tienen (íconos) se renuevan cambiando el nombre de la caché (`trucostats-v4`), que borra la vieja al activarse.
  - **Nunca guarda respuestas de la API.** Durante semanas, grupos y sesiones no se actualizaban entre celulares porque el service worker devolvía respuestas viejas de `/api`. La caché sirve para lo que no cambia; para datos que cambian y dependen de quién pide, hay que desactivarla (`Cache-Control: no-store` en el servidor y `cache: 'no-store'` en la app).
  - Una app abierta en segundo plano puede seguir con código viejo: al volver a verla compara su archivo principal con el publicado y se recarga si cambió (una sola vez por versión). Esa comparación tiene que ir al servidor: al principio el service worker la contestaba con una copia vieja de la página y la app se recargaba cada vez que volvía, a veces sin conexión todavía, y quedaba vacía y sin botones. Ahora el service worker no toca los pedidos `no-store`.
  - Al guardar la página, el service worker guarda también todos los archivos que usa (los saca de su HTML). Así una página guardada nunca queda sin su código.
- **Íconos:** `npm run icons` (`@vite-pwa/assets-generator`) genera todos los tamaños desde `public/app-icon.svg`. El **maskable** lleva margen porque Android recorta los íconos en círculo u otras formas.
- **Manifiesto servido por el Worker:** la app instalada arranca en el `start_url` del manifiesto, y en el iPhone no comparte nada con Safari: quien instalaba la app desde un enlace de invitación la abría en el inicio, sin el enlace. Por eso el Worker sirve el manifiesto y entrega uno propio por invitación (`/api/manifiesto/<código>`) con `start_url` en esa invitación. La pantalla de la invitación cambia el `<link rel="manifest">` a ese. Todos llevan el mismo `id`, para que sea siempre la misma app aunque arranque en otra dirección.
- **Instalación:**
  - En Android, el evento `beforeinstallprompt` permite un botón "Instalar" de un toque.
  - En iPhone solo se pueden mostrar los pasos (Compartir → Agregar a Inicio).
  - `display-mode: standalone` dice si la app ya está instalada.
- **Sin pantalla de carga:** la app pesa unos 130 KB comprimidos y, después de la primera visita, abre desde la caché del service worker, así que tarda una fracción de segundo. Un logo de carga se veía como un parpadeo, así que preferí no tenerlo: mientras arranca solo se ve el fondo negro (definido en `index.html`, el mismo de la franja de la hora y de la pantalla de Android).

## Cloudflare Workers

- **Hosting:** Cloudflare sirve la app (**assets estáticos** de `dist`) y ejecuta el servidor en su red, gratis en el plan básico.
- **Worker:** el programa del servidor (`worker/index.ts`). En `wrangler.jsonc`, `run_worker_first: ["/api/*"]` hace que el Worker atienda la API y el resto sirva la app. Las rutas desconocidas devuelven la app (**fallback de SPA**), que maneja la navegación.
- **Wrangler:** la herramienta de línea de comandos.
  - `wrangler dev` corre todo en la PC.
  - `npm run deploy` compila y publica.
  - `wrangler secret put` guarda claves.
- **Binding:** nombre con el que el Worker usa un recurso (`env.DB` para la base), sin escribir direcciones ni contraseñas en el código.
- **Variables y secretos:**
  - `vars` en `wrangler.jsonc` es para datos públicos, como `APP_URL`.
  - Los **secretos** (la clave de Brevo) se cargan con Wrangler y nunca van al repositorio.
  - En local van en `.dev.vars`, que Git ignora.
- **Ruta de salud** (`/api/salud`): responde "estoy funcionando"; la uso para comprobar cada publicación.
- **Placement:** por defecto el Worker corre cerca del usuario, pero la base está en el este de EE.UU. Como cada pedido hace varias consultas seguidas, configuré el Worker para correr junto a la base (`placement.region`). Quedó un solo viaje largo, y los pedidos pasaron de ~0,7 s a ~0,27 s.

## Base de datos: D1 y SQL

- **D1:** la base de datos SQL de Cloudflare, basada en **SQLite**. Guarda lo que comparten los celulares. `--local` usa una copia en la PC; `--remote`, la real.
- **Migraciones:** archivos SQL numerados en `migrations/`, que cambian el esquema en orden y una sola vez, igual en la PC y en producción. En producción se aplican **antes** de publicar el código que las necesita. Una migración ya aplicada no se edita: se agrega otra.
  - `0001` grupos, integrantes, partidas y jugadores · `0002` código de invitación · `0003` cuentas y sesiones · `0004` cancelación e historial de cambios · `0005` varios administradores · `0006` invitados y apodos · `0007` y `0008` partidas en vivo · `0009` enlaces por correo · `0010` versión del grupo · `0011` usuario sin distinguir mayúsculas.
- **Conceptos de SQL:**
  - **Clave primaria** (identifica cada fila) y **clave foránea** (la enlaza con otra tabla).
  - **`ON DELETE CASCADE`:** al borrar un grupo se borran sus integrantes. Las partidas no tienen esa regla a propósito: se conservan.
  - **Índice:** acelera búsquedas frecuentes. Un **índice único** impide repetidos (usuario, apodo dentro del grupo).
  - **`JOIN`:** une tablas en una sola consulta; trae los jugadores de todas las partidas de un grupo de una vez.
  - **Lote atómico** (`batch`): varias sentencias juntas; si una falla, no se guarda ninguna.
  - **Migración que transforma datos:** además de agregar columnas, un `UPDATE` adapta lo que ya existía.
  - **Disparador** (trigger): regla que se ejecuta sola después de un `INSERT`, `UPDATE` o `DELETE`. Lo uso para subir la versión del grupo con cualquier cambio, sin depender de que el código se acuerde.
  - **`COLLATE NOCASE`:** compara sin distinguir mayúsculas. El usuario se guarda como se escribe ("Guzman") pero "guzman" es el mismo.
- **Borrado lógico** (soft delete): una partida cancelada no se borra, se marca. Queda rastro y se puede restaurar.
- **Tabla de eventos** (auditoría): `match_events` guarda quién registró, canceló o restauró cada partida y cuándo. Solo se agregan filas, nunca se editan.
- **Límite del plan gratuito:** 5 millones de filas leídas por día. Por eso las actualizaciones sin cambios no leen las partidas (ver "API y HTTP").

## API y HTTP

- **API:** la forma en que la app y el servidor se hablan, con rutas bajo `/api/` y datos en **JSON**. Las rutas anidadas reflejan pertenencia: `/api/grupos/:código/partidas`.
- **Métodos:** `GET` lee, `POST` crea o ejecuta una acción, `PATCH` cambia una parte, `PUT` reemplaza, `DELETE` borra.
- **Códigos de estado:** 200 ok, 201 creado, 304 sin cambios, 400 pedido inválido, 401 sin sesión, 403 sin permiso, 404 no existe, 405 método no permitido, 409 conflicto.
- **Validar en el servidor:** la app puede equivocarse o ser manipulada; el servidor nunca confía en lo que recibe y comprueba también las reglas del negocio (por ejemplo, que los jugadores sean del grupo).
- **Idempotencia:** enviar dos veces la misma partida tiene el mismo efecto que enviarla una. Como la app crea el id de cada partida y de cada grupo, se puede reintentar sin duplicar nada.
- **ETag y 304:**
  - Las respuestas del grupo y de sus partidas llevan una etiqueta de versión (`ETag`), hecha con la versión del grupo y la cuenta que pregunta.
  - La app la manda en el pedido siguiente (`If-None-Match`). Si nada cambió, el servidor responde **304** sin cuerpo y sin leer las partidas.
  - Por eso puedo actualizar cada 5 s casi sin costo.
- **Polling y latido:**
  - Quien mira una partida en vivo le pregunta al servidor cada pocos segundos (**polling**). Es más simple y gratis que una conexión abierta (WebSocket), y alcanza para un marcador.
  - Quien cuenta publica cada tanto aunque no cambie nada (**latido**), así el servidor sabe que la partida sigue viva.
  - Los tiempos ("hace cuánto se actualizó") salen del reloj del servidor, no del celular, que puede estar desfasado.
- **Cliente de la API** (`src/lib/api.ts`): un solo lugar para todos los pedidos, con límite de tiempo, token de sesión y errores uniformes.

## Cuentas y seguridad

- **Contraseñas:** nunca se guardan. Se guarda un **hash**: el resultado de mezclar la contraseña con una **sal** aleatoria (distinta por usuario) muchas veces (PBKDF2, 100.000 vueltas). Es lento a propósito, para que probar contraseñas robadas sea inviable.
- **Sesiones con token:**
  - Al iniciar sesión, el servidor entrega un código aleatorio largo. La app lo manda en cada pedido (`Authorization: Bearer ...`).
  - En la base solo se guarda su hash: leer la base no permite usar sesiones.
  - Los enlaces por correo funcionan igual: son de un solo uso, vencen y se guarda solo su hash.
- **Autenticación vs. autorización:** "¿quién eres?" (401 si no hay sesión válida) vs. "¿puedes hacer esto?" (403). Un 401 a una sesión guardada significa que venció; por eso, cuando la sesión es válida pero un dato está mal (la contraseña actual al cambiarla), respondo 403.
- **No revelar quién tiene cuenta:**
  - El mismo error para "no existe" y "contraseña incorrecta".
  - La misma respuesta al pedir recuperar la contraseña, exista o no la cuenta.
  - **Comparación en tiempo constante:** no cortar en la primera diferencia, para no filtrar información por el tiempo de respuesta.
- **Enlaces seguros:** el enlace del correo usa una dirección fija (`APP_URL`), no la del pedido, para que nadie pueda hacer que apunte a otro sitio. Máximo 3 correos por hora por cuenta.
- **Sin cuentas invitadas:** al principio, quien entraba por un enlace sin cuenta recibía una identidad sin datos guardada solo en su celular. Su lugar en el grupo quedaba "tomado" por alguien que no podía volver a entrar desde otro celular. Preferí exigir cuenta para unirse: cada lugar es de una persona real.
- **Permisos por fila:** la app muestra una acción solo si la persona puede usarla, y el servidor lo vuelve a comprobar. La app nunca es la única barrera.
- **Código de invitación:** 32 caracteres aleatorios (128 bits) que no se pueden adivinar. Funciona como contraseña del grupo.
- **Decisiones:**
  - Preferí cuentas con usuario y contraseña, con correo opcional (solo para recuperarla).
  - Hace falta cuenta para crear grupos y para unirse a uno; el contador y la partida rápida funcionan sin cuenta.
  - Al eliminar una cuenta no se borran sus partidas, porque también son de los demás: su integrante queda libre en el grupo.
  - Apple exige que una app con cuentas permita eliminarlas.

## Sincronización

- **Primero subir, después bajar:** al abrir un grupo, la app envía lo pendiente y después trae lo de los demás. Así no pierdo partidas propias.
- **Estado pendiente:** cada partida guarda cuándo la confirmó el servidor (`syncedAt`); si falta, está pendiente y se reintenta al abrir el grupo, al volver la conexión (evento `online`) o cada 5 s.
- **El servidor manda** en lo que ya confirmó; lo propio que todavía no se envió nunca se pisa. **Fusionar** (merge) en vez de reemplazar.
- **Reintentar con criterio:**
  - Sin conexión o con el servidor caído, se frena y se prueba más tarde.
  - Si el servidor rechaza una partida concreta, se sigue con las demás.
  - Nunca dos envíos a la vez: si ya hay uno en curso, se pide una vuelta más.
- **`Promise.allSettled`:** espera todas las promesas, salgan bien o mal, y deja decidir con cada resultado. `Promise.all` se rinde con la primera que falla.
- **Orden entre servidor y celular:** para salir de un grupo, primero confirma el servidor y después se cambia lo local. Así los dos lados no quedan contradiciéndose si falla la conexión.
- **Operaciones en dos pasos:** una partida cancelada sin conexión se envía y después se cancela en el servidor. Como enviar es idempotente, si falla el segundo paso se reintenta todo sin riesgo.
- **Fuente de verdad:** con sesión iniciada, el servidor dice qué integrante es cada cuenta. Lo que quedó guardado en el celular de otra sesión no vale.
- **Los fallos se muestran:** una operación que falla en silencio es peor que una que avisa. El grupo muestra por qué no se enviaron las partidas, con "Reintentar".

## Correo

- **Brevo:** servicio de correo con API (gratis hasta 300 por día).
  - Sin dominio propio, los servicios gratuitos solo dejan verificar un remitente.
  - La clave y el remitente son secretos del Worker; cambiar la clave no toca el código.
  - En local, `MAIL_LOG=1` escribe el correo en el registro en vez de enviarlo.
- **Confirmar el correo:** un correo nuevo recién se guarda cuando se abre el enlace que llega a esa dirección. Así un error de tipeo no manda la recuperación a otra persona.

## Sistema de puntos

- Todos empiezan en 0. Cada integrante suma o resta según **sus propios puntos**: con pocos, ganar suma mucho y perder casi nada; en 1500 ganar y perder valen lo mismo; arriba de 2250 perder pesa hasta el doble que ganar.
- Así cada jugador se acomoda en una **meseta** que depende de cuánto gana (un jugador parejo, cerca de 1500). Los puntos no tienen que sumar cero entre los dos equipos.
- Ajustes por el objetivo de la partida (a 30 es la referencia), por la diferencia del resultado y por los puntos del rival. Los invitados no suman ni restan.
- Definí cada regla por separado y simulé miles de partidas con el código real antes de fijar los números. Detalle y ejemplos en `requisitos.md` §6.4.

## Pruebas

- **Vitest** ejecuta las pruebas; **Testing Library** prueba los componentes como los usaría una persona; **jsdom** simula el navegador. `waitFor` y `act` esperan los cambios asíncronos.
- **Servidor sin Cloudflare:** `worker/testDb.ts` simula D1 con el SQLite de Node, así pruebo la API y las migraciones reales en segundos.
- **Probar a quien no debería poder:** sin sesión, de afuera del grupo, otro integrante.
- **Una prueba que reproduce un error tiene que fallar antes del arreglo** y pasar después.
- **Chrome sin ventana manejado por código** (protocolo DevTools):
  - Dos perfiles simulan dos celulares contra el servidor local.
  - Saco capturas de cada pantalla para revisar el diseño.
  - Simulo las zonas de un iPhone (`setSafeAreaInsetsOverride`).
  - Mido tiempos reales.
- **Medir en producción:** pedidos reales con una cuenta de prueba, antes y después de cada cambio de rendimiento.

## Decisiones importantes

- Preferí **offline-first**: contar una partida nunca depende de la conexión.
- Preferí **Cloudflare** (Workers + D1) por ser gratis, rápido y tener servidor y base en el mismo lugar.
- Preferí **polling** en vez de conexiones abiertas para las partidas en vivo: más simple y alcanza.
- Preferí que los **apodos se apliquen al leer** las partidas y no al guardarlas: quitar un apodo deja todo como estaba.
- Preferí **cancelar en vez de borrar** partidas, con historial de cambios, para que nadie pueda ocultar resultados.
- Preferí **disparadores** para la versión del grupo, para que ningún cambio se escape.
- Descarté el **dibujo con gestos** en el contador: los botones alcanzan.

## Lecciones

- **No dar algo por arreglado sin reproducir el caso real.** El error más largo era el service worker guardando respuestas de la API, y solo pasaba en el sitio publicado.
- **Medir antes de optimizar.** La lentitud no era el código sino la distancia entre el servidor y la base.
- **Probar como lo usa la gente.** Instalada a pantalla completa, la app se comportaba distinto que en Safari.

## Cómo publico

1. Si hay migraciones nuevas: `npx wrangler d1 migrations apply trucostats-db --remote`.
2. `npm run deploy`.
3. Comprobar `https://trucostats.guzmandls.workers.dev/api/salud`.

Para cambiar el ícono: reemplazar `public/app-icon.svg`, correr `npm run icons` y subir el nombre de la caché en `public/sw.js`.
