# TrucoStats — Requisitos

## 1. Descripción general

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
- El registro pide un usuario (identificador único para entrar, en minúsculas; no tiene por qué ser el nombre de la persona) y una contraseña. El correo es opcional; junto a su título hay un botón "?" que explica que sirve para recuperar la contraseña. Se inicia sesión con el usuario o con el correo. La recuperación de contraseña por correo queda para más adelante.
- La cuenta registrada (con usuario) es obligatoria solo para crear un grupo: el administrador necesita una identidad estable. El contador y la partida rápida funcionan sin cuenta.
- Al crear un grupo, el integrante del creador aparece con su usuario como sugerencia de nombre y puede cambiarlo.
- Unirse a un grupo con el enlace no exige cuenta: al unirse, el servidor crea automáticamente una cuenta invitada (sin correo ni contraseña, invisible para la persona) vinculada a su integrante. Con esa identidad solo ella o el administrador pueden cambiar su nombre, y puede registrar partidas.
- Una cuenta invitada se puede convertir después en una cuenta registrada (usuario y contraseña) sin perder su integrante ni su historial. Si nunca lo hace, funciona igual en ese celular; si lo pierde, pierde esa identidad.
- Solo los integrantes vinculados a una cuenta (con correo o invitada) pueden registrar partidas del grupo. Un integrante ya elegido por otra persona no se puede elegir de nuevo; el administrador podrá liberarlo.
- El menú de las tres rayas de la pantalla principal cambia según la sesión. Sin cuenta registrada (o con una invitada): "Registrarse", "Iniciar sesión" y "Ver perfil", en ese orden, y no aparece "Crear grupo" porque exige cuenta. Con la sesión iniciada: "Crear grupo", "Ver perfil" y "Cerrar sesión", en ese orden.
- Mientras no exista el sistema de cuentas, cada dispositivo tendrá un perfil local único al que se atribuirán las partidas rápidas y la creación de grupos.

### 3.2. Integrantes

- Cada grupo tendrá una lista de integrantes.
- Cada integrante tendrá un nombre y, opcionalmente, una cuenta de usuario vinculada.
- Cada integrante podrá tener una foto de perfil. Si no la tiene, se mostrará una foto por defecto (una silueta sobre un fondo de color derivado del integrante, distinto dentro del grupo).
- La foto de perfil se podrá elegir, cambiar o quitar desde la ficha del integrante dentro del grupo.
- Un integrante sin cuenta vinculada es igualmente válido: acumula partidas y estadísticas dentro de su grupo.
- Un integrante sin cuenta no tiene estadísticas individuales globales, porque no tiene una identidad por fuera del grupo.
- Al ingresar a un grupo con el enlace de invitación, se pregunta "¿Cuál de los integrantes eres?" y el usuario elige a cuál de los integrantes existentes corresponde.
- Al elegir, el usuario puede cambiar el nombre del integrante por el suyo; el cambio lo ven todos los integrantes del grupo y también se actualiza en las partidas ya guardadas.
- Solo el administrador y el propio integrante (con su cuenta, también la invitada) pueden cambiar el nombre de un integrante.
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
- El administrador tendrá acceso a las funciones de administración y podrá cancelar y restaurar partidas del grupo.
- La administración podrá cambiar de manos (por ejemplo, si el administrador actual abusa de su poder). El procedimiento exacto está por definir.
- Mientras no exista el sistema de cuentas, el dispositivo tendrá una lista local de pertenencia: los grupos que aparecen en la pantalla inicial.
- Un usuario podrá salir de un grupo; al hacerlo, el grupo deja de aparecer en su pantalla inicial (se quita de su lista de pertenencia).
- Salir de un grupo no descuenta las partidas ya jugadas: las partidas jugadas por el usuario siguen contando en su perfil personal aunque el grupo se elimine.
- Si el usuario que sale es el administrador y quedan otros integrantes, la administración pasa a otro integrante y el grupo se conserva con sus partidas y estadísticas. El integrante que representaba al usuario queda en el grupo (desvinculado) para que sus estadísticas sigan mostrándose.
- Si el usuario que sale es el administrador y era el único integrante, el grupo se elimina completo (historial y estadísticas de grupo), tras un aviso que advierte que se borrarán esas estadísticas. Las partidas ya jugadas se conservan para el perfil personal.

### 3.4. Pantalla principal

- La pantalla inicial mostrará los grupos de la lista de pertenencia del dispositivo; al salir de un grupo, este deja de mostrarse.
- La pantalla inicial permitirá iniciar una partida rápida, sin grupo ni integrantes.
- La pantalla de un grupo ofrecerá la opción de salir del grupo.
- Cada grupo se presenta como una tarjeta con borde redondeado y margen a los costados (no de borde a borde, para que se note que es un botón). Empieza con una banda negra con letra crema: a la izquierda el nombre del grupo (lo más grande, con la nube de partidas sin enviar al lado) y a la derecha la posición de la persona. Debajo, sobre fondo crema: "N integrantes · M partidas jugadas"; los avatares de los 8 primeros del ranking de puntos, en orden y sin contador de "+N", con los puntos de la persona a la derecha ("105 Pts", en tamaño menor al nombre); y la última partida ("Última: ganaste 30 – 21 · hoy", o quién ganó si la persona no jugó; "Sin partidas todavía" si no hay).
- La posición va en la banda negra: con un trofeo dorado, plateado o de bronce si es 1º, 2º o 3º, y solo el número ("5º") del cuarto lugar en adelante. Sin partidas no hay posición ni puntos.
- Si el grupo tiene partidas sin enviar, la nube tachada con la cantidad aparece junto al nombre.
- Al seleccionar un grupo, se accederá a su historial de partidas. Las estadísticas y los participantes se consultan con botones de icono del sector superior, que llevan a sus propias pantallas.
- La pantalla de estadísticas del grupo permitirá alternar entre estadísticas grupales, individuales y enfrentamientos. El sector superior se separa de las pestañas por una línea horizontal, y la pestaña activa se distingue solo por la inversión de colores.
- Los enfrentamientos se muestran como una grilla simétrica: cada fila y cada columna corresponde a un integrante y cada celda, al resultado entre ambos.
- La pantalla de participantes mostrará la lista de integrantes en renglones destacados con su foto y su nombre; al tocar uno se accede a sus estadísticas individuales dentro del grupo.
- Existirá un perfil personal con las estadísticas del usuario.

## 4. Gestión de partidas

Existen dos tipos de partida:

- **Partida rápida**: se inicia desde la pantalla principal, sin elegir integrantes ni modalidad. Enfrenta "Nosotros" (el usuario) contra "Ellos". Cuenta solo para las estadísticas personales del usuario y no genera historial.
- **Partida de grupo**: se inicia dentro de un grupo, eligiendo a los integrantes de cada equipo. Cuenta para el historial y las estadísticas del grupo.

### 4.1. Creación de partida de grupo

- Cualquier integrante podrá iniciar una partida dentro de su grupo.
- Se admitirán las siguientes modalidades:
  - 1 vs. 1.
  - 2 vs. 2.
  - 3 vs. 3.
- El creador seleccionará a los participantes de cada equipo entre los integrantes del grupo.
- El creador y anotador deberá integrar el equipo "Nosotros".
- Las etiquetas "Nosotros" y "Ellos" son provisorias: sirven únicamente para identificar cada lado durante la partida en curso. La identidad de cada jugador son los integrantes; las etiquetas no tienen significado estadístico.
- El puntaje de victoria predeterminado se elegirá según la modalidad (1 vs. 1, 2 vs. 2 o 3 vs. 3).
- El puntaje de victoria podrá modificarse antes de iniciar la partida y también durante la partida en curso, desde el sector superior del contador.
- El puntaje de victoria nunca podrá fijarse en un valor ya alcanzado por algún equipo: para bajarlo primero habrá que corregir el marcador con Deshacer.
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
- Un toque de Deshacer quitará el último movimiento completo: todos los puntos sumados de una vez.
- Mantener presionado Deshacer quitará movimientos de a uno de forma continua.
- No se podrá deshacer por debajo de cero.

### 4.4. Distribución visual del contador

- La pantalla se dividirá en dos mitades verticales, separadas por una línea central.
- La mitad izquierda corresponderá a "Nosotros".
- La mitad derecha corresponderá a "Ellos".
- Los nombres de los equipos aparecerán en la parte superior.
- En el sector superior estará el botón Volver y un botón de menú (hamburguesa) con las mismas opciones que la pantalla principal, más la opción de cambiar el puntaje de victoria.
- Debajo de cada nombre se encontrará la zona de dibujo correspondiente.
- Los símbolos se dispondrán de arriba hacia abajo, manteniendo un diseño uniforme.
- En la parte inferior central estarán los botones "N" y "E", uno debajo de cada mitad.
- En el extremo inferior izquierdo estará el botón Deshacer de Nosotros.
- En el extremo inferior derecho estará el botón Deshacer de Ellos.
- Los controles inferiores permanecerán fijos y accesibles.

**Alineación con los renglones**

- La zona de dibujo simulará una hoja con renglones horizontales.
- Los símbolos, los textos y los números se apoyarán sobre un renglón, dejando un pequeño margen visible sin tocar la línea.

**Cambio del puntaje de victoria**

- El puntaje de victoria no se muestra dentro de la zona de dibujo: se cambia desde el sector superior.
- La opción del menú muestra el puntaje actual entre dos botones "−" y "+", que lo ajustan de 5 en 5.
- El botón "−" se deshabilita cuando el puntaje ya no puede bajar sin quedar en un valor alcanzado.

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
- Al alcanzar ese puntaje aparecerá la opción de confirmar la finalización, como un diálogo modal superpuesto (el mismo componente que usa la confirmación de cancelar la creación de un grupo), no como una franja dentro de la pantalla.
- El anotador podrá corregir el marcador antes de confirmar.
- Rechazar la confirmación ("No") descontará el punto que alcanzó el puntaje de victoria, para poder continuar la partida; después se podrá corregir con Deshacer, que quita el movimiento completo.
- Solamente el anotador podrá confirmar la finalización.
- Una vez confirmada, la partida pasará al historial de partidas jugadas.
- El resultado se incorporará a las estadísticas.
- No se requerirá confirmación del equipo perdedor.
- Las partidas finalizadas no podrán editarse directamente.

### 4.6. Cancelación y anulación

- Una partida en curso se puede cancelar o reiniciar libremente, sin dejar registro.
- Una partida finalizada la puede cancelar el administrador del grupo en cualquier momento. Quien la registró, si no es administrador, puede cancelarla solo durante 1 hora desde que el servidor la recibió (el plazo no depende de la hora que informa el celular).
- La restauración la puede hacer el administrador siempre; quien canceló, si no es administrador, durante 1 hora desde la cancelación.
- Pasado el plazo, el botón no aparece para quien no es administrador, y el servidor también lo rechaza.
- En la lista del historial, cada partida sobre la que la persona tiene permiso muestra un botón "⋯" con la opción "Cancelar partida" o "Restaurar partida"; si no tiene permiso, el botón no aparece.
- Al cancelar se puede escribir un motivo, que es opcional (hasta 200 caracteres).
- Cancelar y restaurar necesitan conexión, porque el servidor valida los permisos; una partida que todavía no se envió se envía primero.
- Las partidas anuladas no contarán para las estadísticas ni para los puntos.
- Las partidas anuladas seguirán apareciendo en el historial del grupo, marcadas como "Cancelada", para que el administrador no pueda ocultar partidas. El texto es neutro: no insinúa trampa, porque una partida se cancela también por errores al contar o al armar los equipos.
- Si el responsable se equivocó, puede restaurar la partida: vuelve a contar y queda registrado.
- Se conservarán los datos originales de las partidas anuladas.
- Se registrará quién canceló y quién restauró cada partida, cuándo y el motivo.
- Una partida que aún no terminó puede cancelarse o reiniciarse libremente, sin dejar registro.
- Motivo de este diseño: cualquier integrante puede registrar partidas (incluso a propósito para ganarlas), así que el administrador es quien valida; y como el administrador también podría abusar, nada se borra, solo se marca.
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

### 4.8. Partida rápida

- Se inicia desde la pantalla principal, sin elegir integrantes.
- No se elige modalidad; internamente se comporta como 1 vs. 1.
- Enfrenta "Nosotros" (el usuario) contra "Ellos".
- Gana el usuario si gana "Nosotros"; pierde si gana "Ellos".
- Tiene timer y pausa, igual que la partida de grupo.
- El puntaje de victoria es configurable, con un valor por defecto, igual que en la partida de grupo (desde el sector superior del contador).
- Se guarda en el historial personal de partidas rápidas.
- No genera estadísticas de grupos, ni de rivales, ni de compañeros.

## 5. Historial de partidas

Cada grupo dispondrá de un historial de partidas finalizadas válidas. El historial se consulta entrando al grupo correspondiente desde la pantalla principal, no como una pantalla suelta.

Las partidas rápidas no generan historial: se juegan de forma rápida y solo cuentan para las estadísticas personales del usuario.

### 5.1. Presentación

- El historial se agrupa por día, con un título en una banda negra con letra crema: "Hoy", "Ayer" y después la fecha corta ("18 oct", y con el año si es de otro año).
- Cada partida muestra a cada equipo en su línea, con sus avatares y los nombres; el equipo ganador va resaltado (nombre en negrita) y el perdedor atenuado. A la derecha hay un único bloque negro del mismo alto que la barra vertical de la partida, con los dos puntajes en crema separados por una línea crema horizontal en el medio (el del ganador resaltado).
- Una barra negra vertical al costado de cada partida.
- Si la persona jugó, se muestra cuántos puntos sumó o restó en esa partida ("+12 Pts", "−8 Pts"). No se muestra si no jugó, si la partida fue cancelada o si el cambio fue de 0.

### 5.2. Navegar y buscar

- El historial se recorre deslizando hacia abajo. Carga las partidas por tandas: al llegar al final de las cargadas, trae las siguientes automáticamente (scroll infinito), sin botones de paginación.
- El menú del grupo (las tres rayas) tendrá la opción "Búsqueda", con una lupa, para buscar partidas por fecha (número o mes), participantes, resultado, modalidad u otros datos. Cada palabra escrita debe aparecer en la partida.
- El aviso de partidas sin enviar (nube tachada con la cantidad) queda en el encabezado, a la izquierda de los puntos. El encabezado se mantiene despejado para que el nombre del grupo no se corte.
- La búsqueda cubre todo el historial del grupo, no solo las partidas ya cargadas.

Para cada partida se guardará:

- Fecha de la partida.
- Tipo de partida (rápida o de grupo).
- Grupo al que pertenece (solo en partidas de grupo).
- Modalidad y puntaje de victoria (la modalidad solo en partidas de grupo).
- Duración de la partida.
- Participantes de cada equipo.
- Puntuación final de ambos equipos.
- Equipo ganador.
- Usuario que creó y finalizó la partida.

Cada partida de grupo se identifica por los integrantes de cada equipo (por ejemplo, "Juan - Pedro vs Luis - Ana, 30 – 21"), nunca por las etiquetas "Nosotros" y "Ellos".

El historial y las estadísticas de grupo dependen de que existan grupos e integrantes: sin ellos no hay a quién atribuir cada partida de grupo. Por eso los grupos y los integrantes deben implementarse antes que el historial y las estadísticas de grupo.

Las partidas anuladas aparecerán en el historial marcadas como "Cancelada" y estarán excluidas de las estadísticas (ver 4.6).

## 6. Estadísticas

Las estadísticas se calcularán a partir de las partidas válidas, excluyendo las anuladas. Cada partida guarda su duración, que se usa en varios cálculos.

Dentro de cada grupo habrá dos apartados (estadísticas grupales y estadísticas individuales) y una tabla de enfrentamientos. Los integrantes con cuenta vinculada tendrán además un perfil personal.

El usuario tendrá estadísticas personales que combinan partidas rápidas y partidas de grupo, con un desglose entre ambas.

### 6.1. Estadísticas grupales

Resumen del grupo, visible para todos sus integrantes.

- Cantidad total de partidas jugadas.
- Duración promedio de las partidas.
- Partida más larga, partida más corta, partida más pareja (menor diferencia de puntos) y partida con mayor diferencia de puntos. Cada una muestra el resultado, los equipos que jugaron y la fecha, sin fotos. Si hay empate, en la más pareja gana la que más duró y en la de mayor diferencia, la que menos duró.
- Integrante con más victorias.
- Integrante con mejor porcentaje de victorias.
- Integrante con más derrotas.
- Integrante con peor porcentaje de victorias.
- Integrante con más partidas jugadas.
- Mejor pareja (los dos integrantes con mejor porcentaje de victorias juntos).
- Mejor trío (los tres integrantes con mejor porcentaje de victorias juntos).
- Peor pareja (los dos integrantes con peor porcentaje de victorias juntos).
- Peor trío (los tres integrantes con peor porcentaje de victorias juntos).
- Mayor racha de victorias y mayor racha de derrotas del grupo.
- Racha de victorias y racha de derrotas en curso (los resultados seguidos más recientes de cada integrante).
- Rivalidad más repetida: el par de integrantes que más veces se enfrentó, con las victorias de cada uno.

Una racha son al menos dos resultados seguidos iguales; uno solo no cuenta. Si varios integrantes empatan en una racha (por ejemplo, compañeros de equipo), se muestran todos. Si nadie la tiene, se muestra un guion.

Los nombres de los integrantes de un mismo equipo se separan con un guion ("Juan - Pedro"). En los récords, rachas, parejas, tríos y rivalidades se muestra la foto de cada integrante; cuando son varios, las fotos se apilan superpuestas para ahorrar espacio.

Una pareja se cuenta cuando dos integrantes jugaron en el mismo equipo, aunque ese equipo tuviera tres integrantes. Un trío se cuenta cuando los tres integrantes jugaron juntos en el mismo equipo.

Las comparaciones entre integrantes se presentan de forma visual (podio olímpico, barras y rankings), no solo como listas de datos.

El podio muestra hasta tres integrantes ordenados por puntos (ver §6.4), desempatando por porcentaje de victorias y luego por cantidad de victorias. Dos integrantes comparten el mismo puesto cuando tienen los mismos puntos, el mismo porcentaje de victorias **y** la misma cantidad de victorias; en ese caso se muestran los tres bloques con el mismo número de puesto. Cada bloque del podio muestra los puntos, el porcentaje de victorias y la cantidad de partidas jugadas.

### 6.2. Estadísticas individuales del grupo

Para cada integrante del grupo, sus números dentro de ese grupo.

- Cantidad de partidas jugadas.
- Victorias y derrotas.
- Porcentaje de victorias.
- Duración promedio de sus partidas.
- Integrante al que más le gana (con su foto).
- Integrante contra el que más pierde (con su foto).
- Mejor compañero (mayor porcentaje de victorias juntos, con su foto).
- Peor compañero (menor porcentaje de victorias juntos, con su foto).
- Puntos (Pts) acumulados en el grupo.
- Racha más larga de victorias y de derrotas.

El porcentaje de victorias se representa con un anillo circular lleno según el porcentaje, con un color interpolado de forma continua (rojo en los valores bajos, ámbar en los medios y verde en los altos) y el número visible en el centro.

En la pestaña individual se comparan los integrantes mediante un ranking ordenado por porcentaje de victorias, que muestra también los puntos de cada uno; al tocar el nombre de un integrante se accede a su ficha individual con el detalle de estos datos.

### 6.3. Enfrentamientos

Tabla donde se consulta, para cada integrante contra cada uno del resto del grupo:

- Cantidad de partidas jugadas entre ambos.
- Porcentaje de victorias de cada uno contra el otro.

Se presenta como una grilla simétrica: el eje de filas muestra los nombres y el eje de columnas, las fotos de perfil; cada celda, el resultado entre ambos.

### 6.4. Sistema de puntos (Pts)

Cada integrante acumula puntos (Pts) dentro de cada grupo, según los resultados de las partidas de grupo. Los puntos se calculan a partir de las partidas ya guardadas, procesándolas en orden cronológico (del más antigua al más reciente), porque la ganancia y la pérdida de cada partida dependen del puntaje acumulado en ese momento.

- Una partida vale, como base, el objetivo de la partida (a 40 puntos, 40; a 30 puntos, 30; a 20 puntos, 20).
- La diferencia de puntos de la partida ajusta el movimiento: golear (por ejemplo 40 a 0) mueve el máximo y ganar ajustado (por ejemplo 40 a 39) mueve menos. El factor va de 0,75 (partida ajustada) a 1,0 (goleada).
- La diferencia de puntaje acumulado entre los dos equipos (promedio de cada equipo) ajusta el movimiento: si el ganador tiene muchos más puntos que el perdedor, gana menos puntos (y, simétricamente, el perdedor resta menos); si el ganador tiene menos puntos, gana más. Este ajuste va de 0,6 a 1,4.
- Ayuda por puntaje bajo: cuanto menos puntos tiene un integrante, más fácil le resulta sumar. En 0 puntos sus victorias valen x1,8 y a partir de 200 puntos valen x1, disminuyendo gradualmente en el medio.
- Las derrotas son menos negativas que las victorias: un integrante con poco puntaje resta poco (x0,25 en 0 puntos), subiendo gradualmente (más rápido al principio) hasta x1 a partir de 200 puntos.
- Ningún integrante puede quedar con puntaje negativo: el total nunca baja de 0.

Los Pts solo se calculan para partidas de grupo, porque las partidas rápidas no tienen integrantes asociados.

### 6.5. Perfil personal

Los usuarios tendrán un perfil con sus estadísticas personales: sus partidas rápidas más las de los integrantes a los que están vinculados, en todos sus grupos.

- Cantidad total de partidas.
- Victorias y derrotas.
- Porcentaje de victorias.
- Duración promedio.
- Cantidad de grupos en los que participa.
- Desglose de partidas: totales, rápidas y de grupo.
- Partidas rápidas: cantidad, porcentaje de victorias y duración promedio.

El perfil personal será visible para los integrantes de los grupos en los que participa.

Estado actual: mientras no exista el vínculo usuario ↔ integrante, el perfil suma todas las partidas guardadas en el dispositivo.

### 6.6. Criterios de cálculo y privacidad

- En partidas por equipos, cada victoria contará como una victoria individual de cada integrante del equipo ganador frente a cada integrante del equipo perdedor.
- El porcentaje de victorias se calcula sobre las partidas jugadas.
- Las comparaciones de "más/menos" y "mejor/peor" exigirán un mínimo de 3 partidas jugadas, para no basarse en porcentajes engañosos.
- "Mejor compañero" y "peor compañero" solo aplican a partidas con equipos de más de un integrante (2 vs. 2 y 3 vs. 3).
- En las partidas rápidas se cuenta una victoria si gana "Nosotros" y una derrota si gana "Ellos".
- Las partidas rápidas no generan estadísticas de rivales ni de compañeros.
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

El desarrollo ya está en marcha (contador, partida de grupo, historial local, estadísticas y publicación en Cloudflare). Siguen sin definirse:

- Sistema definitivo de registro, inicio de sesión y recuperación de cuentas.
- Gestión de invitaciones y enlaces para unirse a grupos.
- Administración de integrantes que abandonan un grupo.
- Procedimiento para cambiar o transferir el administrador de un grupo.
- Puntaje de victoria por defecto de la partida rápida.
- Diseño visual definitivo de las pantallas.
- Comportamiento del reconocimiento de gestos ante trazos ambiguos o incorrectos.
- Reglas de sincronización y resolución de conflictos entre dispositivos.
- Aplicación del plazo de anulación de 15 minutos cuando la partida se finaliza sin conexión.
- Comportamiento ante pérdida de datos locales o cambio de dispositivo.
- Sistema de copias de seguridad y recuperación.

### Alcance de la primera versión (MVP)

Objetivo: que un grupo de amigos comparta partidas y estadísticas desde distintos celulares.

Entra:

- Contador offline con botones, partida rápida y partida de grupo (ya implementado).
- Historial y estadísticas de grupo, y perfil personal local (ya implementado).
- Publicación en Cloudflare (ya implementado).
- Backend mínimo (Cloudflare Workers + D1) para guardar y compartir grupos y partidas entre dispositivos.
- Sincronización de las partidas guardadas sin conexión al recuperar la conectividad.
- Cuentas con usuario y contraseña, y correo opcional (registro e inicio de sesión), y vínculo usuario ↔ integrante.
- Invitaciones: cada grupo tiene un código o enlace secreto, compartible por WhatsApp, para que otras personas entren.
- Mientras no existan las cuentas, cualquier persona puede crear un grupo.

Queda para después:

- Dibujo asistido con gestos (los botones alcanzan en el MVP).
- Cancelación y restauración de partidas por el administrador (necesita cuentas).
- Perfil personal visible para otros integrantes.
- Copias de seguridad y recuperación de cuentas.

## 11. Consistencia visual

Todas las pantallas se diseñarán con el sistema de interfaz compartido, para que el espaciado y la composición sean idénticos en toda la app:

- Toda pantalla se construye con los componentes compartidos (`src/components/ui.tsx`): `Screen`, `PageHeader`, `ScreenContent`, `ScreenFooter`, `Panel`, `Rows`, `Button`, `TextInput`, etc.
- El bloque `ScreenContent` define el ancho máximo, el espaciado lateral y la distancia entre la barra superior negra y el primer elemento del contenido. Ese espaciado es único para toda la app: no se repite ni se ajusta en cada pantalla.
- Los colores, radios, tamaños de toque y espaciados provienen de los tokens de `src/index.css`. No se definen valores locales que contradigan a los compartidos.
- Las particularidades de una pantalla (por ejemplo, la zona de dibujo del contador) no alteran el espaciado base de las demás.
- Si una pantalla necesita un elemento de interfaz nuevo, primero se agrega al sistema compartido y recién después se usa en esa pantalla.

---

## 12. Reglas de diseño

Reglas visuales transversales a toda la app. Se aplican siempre, incluso si una pantalla puntual "se vería bien" de otro modo. Ante conflicto, estas reglas tienen prioridad.

### 12.1. Jerarquía y coherencia de líneas

El grosor de toda línea divisoria proviene de los tokens de `src/index.css` y respeta **siempre** una escala de tres niveles ordenada por jerarquía. El grosor debe ordenarse igual que la jerarquía: una línea de menor jerarquía nunca puede ser más gruesa que una de mayor jerarquía, sin importar el color.

| Nivel | Jerarquía | Grosor | Token | Uso |
| --- | --- | --- | --- | --- |
| 1 | Máxima | 3px | `--rule-width` | Separación entre zonas mayores: barra superior negra ↔ contenido, eje de encabezados ↔ cuerpo de la grilla. Sobre negro se dibuja en crema (`--paper`); sobre crema, en tinta (`--ink`). |
| 2 | Media | 2px | `--border-width` | Separación entre secciones sobre crema, bordes de paneles, tarimas y campos. |
| 3 | Mínima | 1px | `--hairline-width` | Divisiones dentro de una misma sección: filas, subdivisores, celdas de la grilla. Sobre crema en tinta tenue (`--line-thin`), sobre negro en crema tenue (`--line-paper`). |

- Ninguna división de nivel 3 (filas, celdas) puede ser más gruesa que una de nivel 2, ni una de nivel 2 más gruesa que una de nivel 1.
- Los grosores no se escriben con valores literales en los `*.module.css`: se usan siempre los tokens.

### 12.2. Áreas negras contiguas

Dos elementos con fondo negro (botones, celdas, encabezados) nunca se muestran uno al lado del otro sin una línea crema de separación entre ellos. El borde negro seguido de negro se ve mal; siempre hay una división visible.

### 12.3. Uso de tarjetas

Las tarjetas (`Panel`, `PanelLink`) se usan **exclusivamente** en la pantalla principal para presentar grupos. En el resto de la app el contenido se estructura con secciones full-bleed (`Section`), no con tarjetas flotantes.

### 12.4. Elementos flotantes

Los elementos no "flotan" con separaciones arbitrarias ni centrados sueltos. Las grillas ocupan el ancho de la pantalla y se anclan a los bordes de la sección.

### 12.5. Prioridad de correcciones

Estas reglas recogen correcciones ya hechas en el pasado. Una corrección visual indicada por el responsable del proyecto se aplica en toda la app (no solo en la pantalla señalada) y se documenta aquí para no repetir el error.

### 12.6. Escala de espaciado

Todos los `padding`, `gap` y `margin` de bloques provienen de una escala de múltiplos de 4px definida como tokens en `src/index.css`. No se escriben valores literales de espaciado en los `*.module.css`.

| Token | Valor |
| --- | --- |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |

- Se permite usar valores fuera de la escala únicamente para micro-ajustes tipográficos (por ejemplo, la separación de 2px entre un número y su etiqueta), nunca para el espaciado de layout.
- Los `margin: 0`, `padding: 0` y `gap: 0` (resets) no se tokenizan.

### 12.7. Tipografía

Todo `font-size` proviene de la escala de tokens `--text-xs` a `--text-3xl` de `src/index.css`, y todo `letter-spacing` de `--tracking-tight`, `--tracking-wide` o `--tracking-caps`. No se escriben tamaños literales en los `*.module.css`.

### 12.8. Zonas táctiles

Todo elemento que se toca mide al menos 44px de alto y de ancho (`--tap-min`).

### 12.9. Contraste y estados

- El texto secundario usa `--ink-muted` (o `--paper-muted` sobre negro); no se logra con `opacity`.
- Los porcentajes y números se muestran en tinta; el color de la escala rojo–verde se reserva para barras y anillos.
- Los elementos deshabilitados usan un único valor (`--disabled-opacity`).

### 12.10. Componentes compartidos de estado

- Una lista sin datos usa `EmptyNote`; un aviso dentro de la pantalla usa `Notice`.
- Varias fotos de integrantes juntas usan `AvatarStack`.
- Dentro de un grupo no se repite el color por defecto de los avatares.

---

**Estado:** Requisitos funcionales en elaboración.

**Objetivo de desarrollo:** construir una aplicación funcional mientras se adquiere experiencia con TypeScript, React, SQL, Git y desarrollo web.