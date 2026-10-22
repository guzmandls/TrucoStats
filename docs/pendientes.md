# trucoStats — Pendientes y deuda técnica

Registro de cosas identificadas durante el desarrollo que quedan para más adelante.
No son requisitos nuevos: son notas para no olvidarlas.

La **versión 1** quedó completa el 22/10/2026 (ver el resumen al principio de
`desarrollo.md`). Al final de este documento están las ideas para el futuro.

## Sincronización

- Si un grupo se registró en el servidor pero la app no llegó a guardar el código
  de invitación (por ejemplo, se cerró justo en ese momento), al invitar el
  servidor responde que el grupo ya existe (409) y no hay forma de recuperar el
  código. Revisar si hace falta una forma de recuperarlo.

- Los otros celulares reciben nombres, fotos y partidas al abrir el grupo con
  conexión (5d). Si un cambio de foto se hace sin conexión, queda solo en ese
  celular y se pierde en la próxima sincronización (el servidor manda). Lo mismo
  ocurriría con un cambio de nombre fallido, pero ese no se puede hacer fuera
  del flujo de unirse.
- Las estadísticas y los participantes leen lo que hay en el celular: la
  sincronización ocurre al abrir la pantalla del grupo.
- Una partida que el servidor rechaza (por ejemplo, porque incluye a un integrante
  que el servidor no conoce) queda "sin enviar" para siempre y el aviso del
  encabezado no desaparece. Hoy no debería pasar, pero conviene decidir qué hacer
  con una partida rechazada de forma definitiva.
- Las partidas de grupo jugadas antes de existir la sincronización se envían la
  primera vez que se abre el grupo con conexión.
- El nombre se puede cambiar sin controles: cualquiera con el enlace puede
  renombrar a cualquier integrante (ver requisitos §3.2).

## Modelo de datos

- Al salir del grupo siendo el único integrante, se borra el grupo pero **no** sus
  partidas (`matches`), para que sigan contando en el perfil personal. Quedan
  partidas con un `groupId` que ya no existe. Revisar si conviene marcarlas con
  algún estado ("grupo eliminado") en lugar de dejarlas huérfanas.

## Funcional (revisado en el repaso del flujo)

- **Timer y pausa de partida (requisitos §4.7)**: implementados
  (`src/features/counter/gameTimer.ts`, integrados en `useCounter`). El timer
  arranca al entrar al contador (la primera ronda se juega desde 0-0) y se
  guarda en `Match.durationSeconds`. Al pausar se bloquean sumar, restar y
  deshacer hasta reanudar.
- **Partida de grupo en curso que apunta a un grupo eliminado**: el slot
  `group:<id>` puede quedar huérfano (no se muestra en ningún lado). Revisar si
  conviene limpiarlo al salir del grupo.
- **Iniciar partida de grupo por URL directa** (`/partida-grupo/:id`) con una
  partida de grupo en curso borra la partida en curso sin avisar
  (`clearGame` en `StartGroupGameScreen.start`). No hay enlace directo que lo
  provoque, pero es una vía posible de pérdida de datos.

## Calidad de código

- `npm run lint` y `prettier --check .` pasan sin avisos (se resolvieron los 4
  problemas antiguos de lint y se configuró `endOfLine: auto` para los saltos
  de línea de Windows). Mantenerlos en cero: si aparece algo nuevo, corregirlo en
  el momento.

## Diseño

- Micro-ajustes tipográficos por debajo de la escala de espaciado (2px/3px/6px)
  están permitidos a propósito (requisitos §12.6). No convertirlos en tokens.

## Cancelar partidas

- Cancelar y restaurar una partida ya enviada necesitan conexión (decidido). Las
  partidas sin enviar se cancelan y restauran sin conexión y suben ya canceladas.
- Los puntos (Pts) se recalculan al cancelar o restaurar, pero no hay aviso al
  resto del grupo.

## Cuentas

- Quien tiene una cuenta invitada y luego inicia sesión en otra cuenta existente
  abandona la identidad invitada (y su integrante queda vinculado a esa cuenta
  invitada, que ya no se usa). El administrador puede liberar ese integrante.
- Los errores al subir una foto o cambiar un nombre sin permiso se ignoran en
  silencio.

## Mantenimiento

- **Clave de Brevo (correos):** no vence, pero Brevo la desactiva si pasan 90 días
  sin usarse. Si los correos de recuperación dejan de llegar, revisar en Brevo y,
  si hace falta, crear otra con `npx wrangler secret put BREVO_API_KEY`. Se puede
  programar una tarea mensual (cron de Cloudflare) que la mantenga activa.
- **Rotar esa clave** cuando se pueda: se pegó en un chat durante el desarrollo.
- **Cuenta de prueba en producción:** `prueba_velocidad`, con el grupo "Prueba de
  velocidad", se creó para medir tiempos. Nadie más la ve; se puede borrar.
- **El correo del registro no se confirma** (el que se agrega desde el perfil sí).
- **Probar en teléfonos reales** cada cambio de pantalla completa: Chrome simula
  las zonas de la hora y de la barra de inicio, pero no los errores propios del
  iPhone.

## Futuro (si la app anda bien y tiene buena respuesta)

- **Publicar en App Store y Google Play.** Hoy se instala desde el navegador
  ("Agregar a pantalla de inicio"). Para las tiendas hay que empaquetarla (por
  ejemplo con Capacitor o, en Android, como TWA). Apple cobra una cuenta de
  desarrollador anual y revisa cada versión; Google cobra una única vez.
- **Anuncios** para financiarla (en las tiendas, con una red como AdMob), sin
  que molesten mientras se cuenta una partida.
- **Liga global con sistema de Elo:** un ranking de toda la app, además del de
  cada grupo. El sistema de puntos actual (meseta, rival, margen) puede ser la
  base.
- **El problema de las trampas:** en una liga global cualquiera podría cargar
  partidas falsas. Ideas: que cuenten solo las partidas confirmadas por los
  jugadores de los dos equipos, o por un tercero.
- **Torneos de truco** con árbitros o personas habilitadas que confirmen que las
  partidas son legítimas, para que cuenten en la liga.
- La conclusión del desarrollador: la app tiene mucho futuro en Uruguay.
