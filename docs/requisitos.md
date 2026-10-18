Inicialmente estará destinada a un grupo de aproximadamente 15 amigos, pero se diseñará para que otros grupos puedan utilizarla en el futuro.

El objetivo es ofrecer un contador sencillo, rápido y similar al conteo tradicional en papel, incorporando historial y estadísticas.

## 2. Requisitos generales

- Será una aplicación web progresiva (PWA), instalable en iPhone.
- Su desarrollo y funcionamiento inicial deberán ser gratuitos.
- El contador deberá funcionar sin conexión a Internet.
- Los datos registrados sin conexión se sincronizarán al recuperar la conectividad.
- Permitirá consultar partidas en curso, historial y estadísticas.
- La interfaz estará diseñada principalmente para teléfonos móviles.
- Se priorizarán la facilidad de uso, la rapidez y la prevención de errores.

## 3. Usuarios, integrantes y grupos

La app está pensada para grupos de amigos donde no todos usan el contador. Por eso la pieza central es el **integrante**, que puede existir con o sin cuenta.

### 3.1. Usuarios

- Un usuario es una persona con cuenta única en TrucoStats (registro e inicio de sesión).
- Podrá estar vinculado a integrantes en uno o varios grupos.
- Podrá consultar sus estadísticas individuales globales, sumando las partidas de los integrantes a los que está vinculado, en todos sus grupos.
- El perfil personal será visible para los integrantes de los grupos en los que participa.
- El sistema de registro y recuperación de cuentas está pendiente de definición.

### 3.2. Integrantes

- Cada grupo tendrá una lista de integrantes.
- Cada integrante tendrá un nombre y, opcionalmente, una cuenta de usuario vinculada.
- Un integrante sin cuenta vinculada es igualmente válido: acumula partidas y estadísticas dentro de su grupo.
- Un integrante sin cuenta no tiene estadísticas individuales globales, porque no tiene una identidad por fuera del grupo.
- Al ingresar a un grupo, un usuario elegirá a cuál de los integrantes existentes corresponde.
- El vínculo entre cuenta e integrante es auto-declarado y no verificado; el administrador podrá corregirlo.
- Desvincular una cuenta no modifica las partidas ya registradas; solo afecta a los vínculos futuros.

### 3.3. Grupos

- Cualquier usuario podrá crear un grupo.
- El creador será automáticamente su administrador y un integrante del grupo.
- Al crear el grupo, el creador definirá la cantidad de integrantes y el nombre de cada uno.
- Los integrantes podrán invitar a otras personas mediante un enlace compartible, por ejemplo, por WhatsApp.
- Cada grupo tendrá sus propios integrantes, partidas, historial y estadísticas.
- Los integrantes podrán consultar las estadísticas correspondientes a su grupo.
- El administrador podrá administrar el grupo: editar a los integrantes (agregar, renombrar y dar de baja) y vincular o desvincular cuentas.
- Dar de baja a un integrante con partidas jugadas lo ocultará de la lista sin borrar sus partidas ni sus estadísticas.
- El administrador tendrá acceso a las funciones de administración y al historial de partidas anuladas.

### 3.4. Pantalla principal

- La pantalla inicial mostrará los grupos a los que pertenece el usuario, sea como administrador o vinculado a un integrante.
- Los grupos se presentarán mediante tarjetas (cards).
- Al seleccionar un grupo, se accederá a sus partidas, integrantes, historial y estadísticas.
- Existirá un perfil personal con las estadísticas globales de los integrantes con cuenta vinculada.

## 4. Gestión de partidas

### 4.1. Creación

- Cualquier integrante podrá iniciar una partida dentro de su grupo.
- Se admitirán las siguientes modalidades:
  - 1 vs. 1.
  - 2 vs. 2.
  - 3 vs. 3.
- El creador seleccionará a los participantes de cada equipo entre los integrantes del grupo.
- El creador y anotador deberá integrar el equipo "Nosotros".
- Las etiquetas "Nosotros" y "Ellos" son provisorias: sirven únicamente para identificar cada lado durante la partida en curso y no tienen ningún significado estadístico.
- Los puntajes de victoria predeterminados serán:
  - 1 vs. 1: 20 puntos.
  - 2 vs. 2: 30 puntos.
  - 3 vs. 3: 40 puntos.
- El puntaje de victoria podrá modificarse antes de iniciar la partida.
- Se admitirán puntajes entre 10 y 100, en intervalos de 5.
- El creador será el único anotador autorizado.
- Los demás integrantes podrán visualizar la partida en curso cuando tengan conexión, pero no modificarla.

### 4.2. Conteo de puntos

- Cada equipo tendrá su propio marcador.
- Los puntos se representarán mediante los símbolos tradicionales del truco: cuadrados formados por cuatro lados y una diagonal.
- Cada segmento representará un punto.
- Cada cuadrado completo con su diagonal representará cinco puntos.
- El anotador podrá sumar puntos mediante botones o dibujando segmentos.
- El orden predeterminado de los segmentos será: lado izquierdo, lado superior, lado derecho, lado inferior y diagonal (del vértice inferior izquierdo al superior derecho).
- Podrá corregir errores utilizando botones Deshacer.
- No será necesario registrar cada movimiento del contador en el historial de auditoría.

### 4.3. Sistema de interacción

El contador tendrá un único sistema de conteo que admitirá dos formas de sumar puntos.

**Dibujo asistido**

- El usuario podrá dibujar segmentos directamente con el dedo.
- Podrá dibujar varios segmentos mediante un único gesto continuo, sin levantar el dedo.
- Se reconocerán los cambios de dirección dentro de un mismo gesto.
- Los trazos se ajustarán automáticamente a líneas rectas y uniformes.
- Se respetarán exactamente los segmentos y posiciones dibujados, sin reemplazarlos por otros equivalentes en puntuación.
- Los segmentos podrán completarse en cualquier orden.
- No se contabilizará dos veces un segmento existente.
- Los símbolos se organizarán en columnas alineadas.
- El reconocimiento de gestos funcionará sin conexión a Internet.

**Botones de incremento**

- Existirán dos botones: "N" para Nosotros y "E" para Ellos.
- Un toque corto agregará un punto al equipo correspondiente.
- Cada punto agregado completará automáticamente el siguiente segmento disponible.
- Mantener presionado un botón agregará puntos continuamente.
- La velocidad de incorporación de puntos aumentará progresivamente, hasta un límite máximo.
- Al soltar el botón se detendrá el incremento.
- Al alcanzar el puntaje de victoria también se detendrá el incremento.

**Corrección de puntos**

- Cada equipo tendrá su propio botón Deshacer.
- Un toque de Deshacer quitará un punto del equipo correspondiente.
- Mantener presionado Deshacer quitará puntos de a uno de forma continua.
- No se podrá deshacer por debajo de cero.

### 4.4. Distribución visual del contador

- La pantalla se dividirá en dos mitades verticales, separadas por una línea central.
- La mitad izquierda corresponderá a "Nosotros".
- La mitad derecha corresponderá a "Ellos".
- Los nombres de los equipos aparecerán en la parte superior.
- Debajo de cada nombre se encontrará la zona de dibujo correspondiente.
- Los símbolos se dispondrán de arriba hacia abajo, manteniendo un diseño uniforme.
- En la parte inferior central estarán los botones "N" y "E", uno debajo de cada mitad.
- En el extremo inferior izquierdo estará el botón Deshacer de Nosotros.
- En el extremo inferior derecho estará el botón Deshacer de Ellos.
- Los controles inferiores permanecerán fijos y accesibles.

**Alineación con los renglones**

- La zona de dibujo simulará una hoja con renglones horizontales.
- Los símbolos, los textos y los números se apoyarán sobre un renglón, dejando un pequeño margen visible sin tocar la línea.
- El puntaje de victoria (objetivo) se mostrará centrado verticalmente sobre los renglones, antes de iniciar la partida.
- Los botones de incremento y decremento del objetivo serán la excepción: se centrarán dentro de su renglón.

**Desplazamiento del contador**

- La línea divisoria central también funcionará como barra de desplazamiento vertical.
- Arrastrar verticalmente sobre la línea desplazará simultáneamente las columnas de Nosotros y Ellos.
- La zona táctil de la línea será ligeramente más ancha que su representación visual, evitando ocupar innecesariamente las zonas de dibujo.
- Como referencia inicial, se considerará un ancho táctil total de 12 a 16 píxeles, ajustable durante las pruebas.
- Un toque simple sobre la línea no realizará ninguna acción.
- Un doble toque sobre la línea llevará a los tantos más recientes.
- El contador avanzará automáticamente para mostrar los últimos segmentos a medida que se sumen puntos.

### 4.5. Finalización de partidas

- Alcanzar el puntaje de victoria no finalizará automáticamente la partida.
- Al alcanzar ese puntaje aparecerá la opción de confirmar la finalización.
- El anotador podrá corregir el marcador antes de confirmar.
- Rechazar la confirmación ("No") mantendrá el marcador alcanzado; para corregirlo se usará Deshacer.
- Solamente el anotador podrá confirmar la finalización.
- Una vez confirmada, la partida pasará al historial de partidas jugadas.
- El resultado se incorporará a las estadísticas.
- No se requerirá confirmación del equipo perdedor.
- Las partidas finalizadas no podrán editarse directamente.

### 4.6. Cancelación y anulación

- El creador podrá cancelar una partida mientras esté en curso.
- El creador podrá anular una partida finalizada durante los primeros 15 minutos.
- Después de ese plazo, únicamente el administrador del grupo podrá anularla.
- Las partidas anuladas no contarán para las estadísticas.
- Las partidas anuladas no aparecerán en el historial general de partidas jugadas.
- El administrador tendrá acceso a un historial separado de partidas anuladas de su grupo.
- Se conservarán los datos originales de las partidas anuladas.
- Se registrará quién anuló cada partida, cuándo y el motivo.
- Las partidas finalizadas no podrán eliminarse físicamente mediante las funciones normales de la aplicación.

### 4.7. Duración de la partida

- Cada partida tendrá un timer que mide su duración.
- El timer comienza al iniciar la partida y termina al confirmar la finalización.
- El tiempo se mostrará en pantalla durante la partida.
- La partida podrá pausarse; mientras esté pausada, el timer se detendrá y aparecerá un aviso "Partida pausada".
- Mientras la partida esté pausada no se podrá sumar ni restar puntos, hasta reanudarla.
- El tiempo en pausa no contará para la duración.
- Solamente el anotador podrá pausar y reanudar.
- La duración se guarda junto con el resultado al finalizar la partida.
- La duración se usa en las estadísticas (promedios, partidas más largas y más cortas).

## 5. Historial de partidas

Cada grupo dispondrá de un historial de partidas finalizadas válidas. El historial se consulta entrando al grupo correspondiente desde la pantalla principal, no como una pantalla suelta.

Para cada partida se guardará:

- Fecha de la partida.
- Grupo al que pertenece.
- Modalidad y puntaje de victoria.
- Duración de la partida.
- Participantes de cada equipo.
- Puntuación final de ambos equipos.
- Equipo ganador.
- Usuario que creó y finalizó la partida.

Cada partida se identifica por los integrantes de cada equipo (por ejemplo, "Juan y Pedro 30 – 21 Luis y Ana"), nunca por las etiquetas "Nosotros" y "Ellos". Esas etiquetas solo existen mientras la partida está en curso.

El historial y las estadísticas dependen de que existan grupos e integrantes: sin ellos no hay a quién atribuir cada partida. Por eso los grupos y los integrantes deben implementarse antes que el historial y las estadísticas.

Las partidas anuladas estarán excluidas del historial general.

El administrador dispondrá de un historial independiente de partidas anuladas.

## 6. Estadísticas

Las estadísticas se calcularán a partir de las partidas válidas, excluyendo las anuladas. Cada partida guarda su duración, que se usa en varios cálculos.

Dentro de cada grupo habrá dos apartados (estadísticas grupales y estadísticas individuales) y una tabla de enfrentamientos. Los integrantes con cuenta vinculada tendrán además un perfil personal.

### 6.1. Estadísticas grupales

Resumen del grupo, visible para todos sus integrantes.

- Cantidad total de partidas jugadas.
- Duración promedio de las partidas.
- Partida más larga y partida más corta.
- Integrante con más victorias.
- Integrante con mejor porcentaje de victorias.
- Integrante con más derrotas.
- Integrante con peor porcentaje de victorias.
- Integrante con más partidas jugadas.
- Mejor pareja (los dos integrantes con mejor porcentaje de victorias juntos).
- Cantidad de partidas por modalidad.

### 6.2. Estadísticas individuales del grupo

Para cada integrante del grupo, sus números dentro de ese grupo.

- Cantidad de partidas jugadas.
- Victorias y derrotas.
- Porcentaje de victorias.
- Duración promedio de sus partidas.
- Integrante al que más le gana.
- Integrante contra el que más pierde.
- Mejor compañero (mayor porcentaje de victorias juntos).
- Peor compañero (menor porcentaje de victorias juntos).
- Racha más larga de victorias y de derrotas.

### 6.3. Enfrentamientos

Tabla donde se consulta, para cada integrante contra cada uno del resto del grupo:

- Cantidad de partidas jugadas entre ambos.
- Porcentaje de victorias de cada uno contra el otro.

### 6.4. Perfil personal

Los integrantes con cuenta vinculada tendrán un perfil con sus estadísticas personales totales, sumando todos los grupos en los que participan.

- Cantidad total de partidas.
- Victorias y derrotas.
- Porcentaje de victorias.
- Duración promedio.
- Cantidad de grupos en los que participa.

El perfil personal será visible para los integrantes de los grupos en los que participa.

### 6.5. Criterios de cálculo y privacidad

- En partidas por equipos, cada victoria contará como una victoria individual de cada integrante del equipo ganador frente a cada integrante del equipo perdedor.
- El porcentaje de victorias se calcula sobre las partidas jugadas.
- Las comparaciones de "más/menos" y "mejor/peor" exigirán un mínimo de 3 partidas jugadas, para no basarse en porcentajes engañosos.
- "Mejor compañero" y "peor compañero" solo aplican a partidas con equipos de más de un integrante (2 vs. 2 y 3 vs. 3).
- Los integrantes sin cuenta vinculada solo tienen estadísticas del grupo, no perfil personal.
- Las partidas anuladas quedarán excluidas de todos los cálculos estadísticos.

## 7. Funcionamiento sin Internet

TrucoStats tendrá un funcionamiento offline-first.

- La aplicación podrá abrirse sin Internet después de haberse instalado y preparado correctamente.
- Permitirá iniciar partidas utilizando integrantes del grupo previamente almacenados en el dispositivo.
- Permitirá contar puntos mediante botones y gestos.
- Permitirá finalizar partidas y guardar sus resultados localmente.
- Permitirá consultar el historial y las estadísticas disponibles en el dispositivo.
- Los datos pendientes se sincronizarán cuando vuelva a existir conexión.
- La sincronización se intentará al recuperar la conexión y al volver a abrir la aplicación.
- Se mostrará claramente si existen partidas pendientes de sincronización.
- No se dependerá exclusivamente de sincronización automática en segundo plano.

Cada partida tendrá un único anotador responsable para evitar modificaciones simultáneas desde distintos dispositivos.

## 8. Seguridad y auditoría

- Cada usuario tendrá una identidad única.
- Cada grupo tendrá un administrador.
- Solo el anotador autorizado podrá modificar una partida en curso.
- Solo los usuarios autorizados podrán cancelar o anular partidas.
- Los permisos se comprobarán en el servidor.
- Las partidas finalizadas y las anulaciones conservarán información de auditoría.
- El registro de auditoría identificará al responsable y la fecha de las acciones relevantes.
- Los usuarios no podrán modificar directamente los resultados almacenados en la base de datos.
- Los datos de cada grupo solamente estarán disponibles para sus integrantes, salvo las funciones de administración que requieran permisos especiales.
- Las estadísticas globales (perfil personal) serán visibles para los integrantes de los grupos en los que participa el usuario.

## 9. Tecnologías previstas

- **Frontend:** React y TypeScript.
- **Aplicación instalable:** PWA.
- **Almacenamiento local:** IndexedDB.
- **Funcionamiento offline:** Service Worker.
- **Backend:** Cloudflare Workers.
- **Base de datos:** Cloudflare D1 (SQLite/SQL).
- **Hosting:** Cloudflare.
- **Control de versiones:** Git y GitHub.
- **Entorno de desarrollo:** VS Code.

Se utilizarán inicialmente planes gratuitos y se priorizarán tecnologías con aplicaciones profesionales.

## 10. Cuestiones pendientes

Antes de comenzar el desarrollo deberán definirse:

- Sistema definitivo de registro, inicio de sesión y recuperación de cuentas.
- Gestión de invitaciones y enlaces para unirse a grupos.
- Administración de integrantes que abandonan un grupo.
- Procedimiento para cambiar o transferir el administrador de un grupo.
- Diseño visual definitivo de las pantallas.
- Comportamiento del reconocimiento de gestos ante trazos ambiguos o incorrectos.
- Reglas de sincronización y resolución de conflictos entre dispositivos.
- Aplicación del plazo de anulación de 15 minutos cuando la partida se finaliza sin conexión.
- Comportamiento ante pérdida de datos locales o cambio de dispositivo.
- Sistema de copias de seguridad y recuperación.
- Alcance de la primera versión funcional (MVP).

---

**Estado:** Requisitos funcionales en elaboración.

**Objetivo de desarrollo:** construir una aplicación funcional mientras se adquiere experiencia con TypeScript, React, SQL, Git y desarrollo web.