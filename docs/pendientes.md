# TrucoStats — Pendientes y deuda técnica

Registro de cosas identificadas durante el desarrollo que quedan para más adelante.
No son requisitos nuevos: son notas para no olvidarlas.

## Cuentas de usuario y vínculo usuario ↔ integrante

- Hoy no existe el sistema de cuentas (ver requisitos §3.1). Mientras tanto, cada
  dispositivo tiene un **perfil local único**.
- Consecuencia: en `leaveGroup` (`src/features/groups/groupsStorage.ts`) se
  **asume que este dispositivo es el administrador** de todos los grupos de su
  Home. Al salir, si quedan integrantes se transfiere la administración a otro
  integrante (el primero distinto del admin actual).
- Cuando existan las cuentas, reemplazar esa suposición por el vínculo real
  usuario ↔ integrante y permitir que el usuario elija a qué integrante
  corresponde al ingresar a un grupo (requisitos §3.2).
- La lista de pertenencia local está en `src/features/groups/membership.ts`
  (localStorage). Cuando existan cuentas, migrar esta lista a un modelo por
  usuario.


## Sincronización

- Si un grupo se registró en el servidor pero la app no llegó a guardar el código
  de invitación (por ejemplo, se cerró justo en ese momento), al invitar el
  servidor responde que el grupo ya existe (409) y no hay forma de recuperar el
  código. Cuando existan las cuentas, el administrador podrá pedirlo de nuevo.

- Un integrante que entra por el enlace no es el administrador, pero `leaveGroup`
  sigue suponiendo que este celular es el administrador. Al salir, transfiere la
  administración en la copia local aunque no corresponda. Revisar con las cuentas.
- Los otros celulares reciben nombres, fotos y partidas al abrir el grupo con
  conexión (5d). Si un cambio de foto se hace sin conexión, queda solo en ese
  celular y se pierde en la próxima sincronización (el servidor manda). Lo mismo
  ocurriría con un cambio de nombre fallido, pero ese no se puede hacer fuera
  del flujo de unirse.
- La app todavía no puede agregar ni dar de baja integrantes después de crear el
  grupo; cuando exista, hay que enviarlo al servidor y a los demás celulares.
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
- **Perfil personal cuenta todas las partidas del dispositivo**: como todavía no
  hay vínculo usuario ↔ integrante, `personalSummary` suma todas las `matches`,
  incluidas las de grupo donde el usuario podría no haber jugado. Cuando existan
  las cuentas, filtrar por las partidas del usuario.
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

- Cancelar y restaurar necesitan conexión. Si hiciera falta hacerlo sin conexión,
  habría que guardar la acción como pendiente y enviarla después (hoy solo se
  guardan así las partidas nuevas).
- Quien cancela o restaura no ve el historial completo de eventos de una partida
  (quién canceló, quién restauró, cuántas veces): el servidor lo guarda
  (`match_events`) pero la app solo muestra el estado actual.
- Los puntos (Pts) se recalculan al cancelar o restaurar, pero no hay aviso al
  resto del grupo.

## Cuentas

- La sesión dura 90 días en el servidor. Si vence, los envíos de partidas quedan
  pendientes (401) y la app no avisa nada: hay que avisar y pedir iniciar sesión.
- Quien tiene una cuenta invitada y luego inicia sesión en otra cuenta existente
  abandona la identidad invitada (y su integrante queda vinculado a esa cuenta
  invitada, que ya no se usa). Falta que el administrador pueda liberar ese
  integrante.
- La app no muestra con qué usuario se inició sesión (el menú solo ofrece cerrar
  sesión).
- Los errores al subir una foto o cambiar un nombre sin permiso se ignoran en
  silencio.

- Los grupos creados antes de existir las cuentas (si alguno llegó a registrarse
  en el servidor) no tienen ningún integrante vinculado a una cuenta, así que
  nadie puede enviar partidas ni cambiar nombres en ellos. Hace falta un camino
  para que el creador "reclame" su integrante de administrador.
- El administrador todavía no puede liberar un integrante elegido por error por
  otra persona ni transferir la administración (requisitos §3.2 y §3.3).
