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

- **Nombre del creador en Crear grupo**: hoy el integrante 1 aparece fijo como
  "Administrador" (`src/features/groups/CreateGroupScreen.tsx`) porque todavía no
  hay cuentas ni perfil. Cuando existan, debe aparecer ahí el nombre del usuario
  que crea el grupo.

## Sincronización

- Si un grupo se registró en el servidor pero la app no llegó a guardar el código
  de invitación (por ejemplo, se cerró justo en ese momento), al invitar el
  servidor responde que el grupo ya existe (409) y no hay forma de recuperar el
  código. Cuando existan las cuentas, el administrador podrá pedirlo de nuevo.
- El primer integrante se guarda en el servidor con el nombre "Administrador".
  Debe usar el nombre de quien crea el grupo cuando existan las cuentas.

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

- `npm run lint` marca 3 errores y 1 aviso que ya existían: bloques `catch`
  vacíos en `useCounter.ts` (línea ~352) y `GroupScreen.tsx` (línea ~91),
  `setState` dentro de un efecto en `GroupScreen.tsx` (línea ~86, aviso de pulsos
  de puntos guardado en sessionStorage) y una dependencia sobrante en un
  `useCallback`.
- `prettier --check .` marca 8 archivos de la raíz (README, package.json,
  index.html, etc.), probablemente por saltos de línea CRLF/LF en Windows.

## Diseño

- Micro-ajustes tipográficos por debajo de la escala de espaciado (2px/3px/6px)
  están permitidos a propósito (requisitos §12.6). No convertirlos en tokens.
