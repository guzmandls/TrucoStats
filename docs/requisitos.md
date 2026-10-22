# trucoStats — Requisitos

## 1. Descripción general

El nombre de la app se escribe siempre **trucoStats**, con la t minúscula (en la app, el ícono instalado, los correos y los textos para compartir).

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

- Un usuario es una persona con cuenta única en trucoStats (registro e inicio de sesión).
- Podrá estar vinculado a integrantes en uno o varios grupos.
- Podrá consultar sus estadísticas individuales globales, sumando las partidas de los integrantes a los que está vinculado, en todos sus grupos.
- El perfil personal será visible para los integrantes de los grupos en los que participa.
- El registro pide un usuario (identificador único para entrar, en minúsculas; no tiene por qué ser el nombre de la persona) y una contraseña. El correo es opcional; junto a su título hay un botón "?" que explica que sirve para recuperar la contraseña. Se inicia sesión con el usuario o con el correo. 
- Recuperar la contraseña: en "Iniciar sesión" hay un enlace "¿Olvidaste tu contraseña?". Se escribe el usuario o el correo y, si la cuenta tiene un correo guardado, se le manda un enlace de un solo uso que vale 1 hora. El aviso es siempre el mismo ("Si existe una cuenta con ese usuario o correo y tiene un correo guardado…"), exista o no la cuenta, para no revelar quién tiene cuenta. Se pueden pedir hasta 3 enlaces por hora por cuenta. Al abrir el enlace se elige la contraseña nueva (dos veces); al guardarla se cierran todas las sesiones de la cuenta y queda iniciada la de ese celular. Las cuentas sin correo no se pueden recuperar. Los correos se envían con Brevo (plan gratuito).
- Agregar o cambiar el correo: en el perfil (cuentas registradas) hay una sección "Correo". Al escribir un correo se manda un enlace de confirmación a esa dirección (vale 24 horas) y recién al abrirlo queda guardado; hasta entonces el correo de la cuenta no cambia. No se puede usar un correo que ya tiene otra cuenta.
- La cuenta registrada (con usuario) es obligatoria solo para crear un grupo: el administrador necesita una identidad estable. El contador y la partida rápida funcionan sin cuenta.
- Al crear un grupo, el integrante del creador aparece con su usuario como sugerencia de nombre y puede cambiarlo.
- Al abrir un enlace de invitación sin sesión iniciada, la pantalla pide primero "Necesitas una cuenta": con los botones "Registrarse" e "Iniciar sesión" (que después vuelven al enlace) y, discreto, "Seguir sin cuenta". Así se evita que alguien se una sin cuenta sin darse cuenta.
- Unirse a un grupo con el enlace sin cuenta (si la persona elige "Seguir sin cuenta"): al unirse, el servidor crea automáticamente una cuenta invitada (sin correo ni contraseña, invisible para la persona) vinculada a su integrante. Con esa identidad solo ella o el administrador pueden cambiar su nombre, y puede registrar partidas.
- Grupos creados antes de las cuentas: un grupo que todavía no está en el servidor es de quien lo creó en ese celular (su administrador figura como la persona de este celular, con sus puntos y su lugar en el ranking, y al invitar el servidor lo vincula como administrador). Sin el vínculo entre la cuenta y un integrante, el servidor no deja enviar ni recibir partidas ni transmitir en vivo. Por eso, al abrir un grupo que está en el servidor, la app comprueba que el servidor sepa qué integrante es la cuenta; si no lo sabe, muestra la pregunta "¿Cuál de los integrantes eres?" (los ya elegidos por otra persona aparecen deshabilitados, con "Ya elegido"). Si el grupo no tiene ningún administrador vinculado (grupo creado antes de las cuentas, aunque otros integrantes ya se hayan unido) y la persona tiene cuenta registrada, al tocar "Soy yo" queda vinculada y como administradora; en los demás casos se une a un lugar libre. "Ahora no" cierra la pregunta y queda un aviso con el botón "Elegir quién eres".
- El nombre de usuario puede tener de 1 a 20 caracteres (letras, números, punto, guion o guion bajo; no distingue mayúsculas).
- Una cuenta invitada se puede convertir después en una cuenta registrada (usuario y contraseña) sin perder su integrante ni su historial. Si nunca lo hace, funciona igual en ese celular; si lo pierde, pierde esa identidad.
- Si la sesión vence (dura 90 días) y el servidor rechaza un envío, la pantalla principal muestra un aviso "Tu sesión venció. Inicia sesión para enviar tus partidas." con un botón "Iniciar sesión"; el aviso desaparece al iniciar sesión de nuevo.
- El menú de tres rayas de la pantalla principal muestra, en su primera línea, con qué usuario se inició sesión ("Invitado" si es una cuenta invitada), en letra crema como las demás opciones; al tocarla se abre el perfil, por lo que con sesión iniciada no hay una opción "Ver perfil" aparte (sin sesión, sí).
- Solo los integrantes vinculados a una cuenta (con correo o invitada) pueden registrar partidas del grupo. Un integrante ya elegido por otra persona no se puede elegir de nuevo; el administrador podrá liberarlo.
- El menú de las tres rayas de la pantalla principal cambia según la sesión. Sin cuenta registrada (o con una invitada): "Registrarse", "Iniciar sesión" y "Ver perfil", en ese orden, y no aparece "Crear grupo" porque exige cuenta. Con la sesión iniciada: "Crear grupo", "Ver perfil" y "Cerrar sesión", en ese orden.
- Al cerrar sesión se quitan del celular los grupos y las partidas de grupo de esa cuenta (la partida rápida se conserva); si hay partidas de grupo sin enviar, antes se avisa que se perderían. Al iniciar sesión o registrarse, los grupos de la cuenta se recuperan desde el servidor.
- Si la app quedó abierta en segundo plano con una versión vieja, al volver a verla se recarga sola cuando hay una versión nueva.
- Quien se unió a un grupo como invitado y luego inicia sesión con una cuenta que ya tenía conserva su lugar: el servidor pasa los integrantes y partidas de la cuenta invitada a esa cuenta (salvo en grupos donde la cuenta ya tiene su propio lugar).
- Con la sesión iniciada, quién es la persona en cada grupo lo decide el servidor: si dice que la cuenta no es ningún integrante, se olvida el integrante que había quedado guardado en el celular y se pregunta quién es.
- La pantalla principal muestra, al final y en chico, la fecha y hora de la versión instalada de la app ("Versión …"), para poder comprobar que se actualizó.
- Al elegir integrante (enlace de invitación o vínculo de la cuenta), si algún lugar figura como "Ya elegido" se indica que hay que iniciar sesión con la cuenta que lo eligió o pedir al administrador que lo libere.
- Mientras no exista el sistema de cuentas, cada dispositivo tendrá un perfil local único al que se atribuirán las partidas rápidas y la creación de grupos.

### 3.2. Integrantes

- Cada grupo tendrá una lista de integrantes.
- Cada integrante tendrá un nombre y, opcionalmente, una cuenta de usuario vinculada.
- Cada integrante podrá tener una foto de perfil. Si no la tiene, se mostrará una foto por defecto (una silueta sobre un fondo de color derivado del integrante, distinto dentro del grupo).
- La foto de perfil se edita tocando la foto: en la ficha del integrante (la edita él mismo o un administrador) y en el perfil propio (la cambia en todos los grupos donde se sabe quién es la persona). Al tocarla se abre una ventana "Editar foto" con "Agregar foto" o "Cambiar foto" y, si ya hay una, "Quitar foto". Una pequeña insignia con un lápiz sobre la foto avisa que se puede editar.
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
- Un grupo puede tener varios administradores a la vez. Quien ya es administrador puede dar ese rol a otro integrante que ya haya sido elegido por una persona, sin dejar de serlo, y puede quitarlo (a otro o a sí mismo) siempre que quede al menos un administrador.
- Los administradores pueden administrar el grupo: agregar integrantes (opción "Agregar integrante" del menú de tres rayas del grupo, que pide el nombre), renombrarlos, darlos de baja y liberarlos (desvincular la cuenta de quien eligió un integrante por error, para que pueda elegir de nuevo; no puede liberarse a uno mismo). Estas acciones están en el menú "⋯" de cada integrante en Participantes, visible solo para administradores, y necesitan conexión.
- Jugadores invitados: en una partida de grupo pueden jugar personas que no son del grupo, siempre que haya al menos un integrante del grupo en cada equipo (los equipos siguen teniendo la misma cantidad de jugadores, hasta 3). Se agregan en "Iniciar partida" con el botón "Agregar jugador", que pide el nombre; el invitado aparece en la lista con la etiqueta "Invitado" y sus botones N y E, y se puede quitar de la lista. Los invitados no suman ni restan puntos y no cuentan en las estadísticas: la partida cuenta como si la jugaran solo los integrantes (por ejemplo, un integrante contra otro). La partida queda en el historial con los nombres de todos.
- Apodos: cada integrante puede tener apodos, los nombres con los que pudieron anotarlo como invitado en partidas anteriores (por ejemplo "Juan", "Juancho", "Juanito"). Al unirse a un grupo hay un campo opcional "Cómo te anotaron antes" para escribirlos, separados por coma. Cuando un invitado de una partida tiene el nombre de un apodo (sin importar mayúsculas ni tildes), la partida cuenta para ese integrante en puntos y estadísticas, también las partidas anteriores. Un apodo no puede repetirse dentro de un grupo ni ser el nombre de otro integrante. Los apodos se editan desde el menú "⋯" de la tarjeta en Participantes ("Editar apodos"): los edita el propio integrante o un administrador, que puede sacarlos para que esas partidas vuelvan a quedar sin integrante vinculado. En la ficha del integrante la sección "Apodos" solo aparece si tiene apodos.
- Partida en vivo: cuando un integrante cuenta una partida de grupo con conexión y sesión, el contador publica automáticamente cómo va (equipos, puntos, objetivo, tiempo y si está pausada) cada vez que cambia y cada 20 segundos. Los demás integrantes del grupo ven en la pantalla del grupo, arriba del historial, una tarjeta "En vivo" por partida con los equipos y el marcador; al tocarla se abre una pantalla de solo lectura con los mismos puntos y el mismo dibujo que ve quien cuenta, el cronómetro y una barra inferior que dice si se mira en vivo, si está pausada o quién ganó. La pantalla se actualiza sola cada 3 segundos. Solo los integrantes del grupo pueden mirarla; no hay enlaces ni se comparte la partida rápida. Cerrar el contador no termina la partida: sigue en vivo, igual que la partida guardada en el celular de quien cuenta, hasta que termina o se cancela; si pasan 12 horas sin que nadie la toque, se da por abandonada y deja de mostrarse. Si se abrió el contador y se salió sin jugar ningún punto, no queda en vivo. Quien mira ve siempre el último marcador; la barra de abajo dice "Partida pausada" cuando está pausada, sea porque la pausaron o porque el contador lleva más de un minuto cerrado (igual que el cronómetro del contador, el tiempo se detiene ahí). Cuando la partida termina aparece un cartel "La partida terminó" ("Ganó X, 30 a 21") con el botón "Ver en el historial"; si se cancela, "La partida fue cancelada" (con el motivo, si lo hay) y el botón "Volver al grupo". El cartel se puede cerrar para seguir viendo el marcador final, y la partida terminada o cancelada deja de figurar en la lista del grupo. Puede haber varias partidas en vivo a la vez en el mismo grupo (cada celular que cuenta una partida tiene la suya, con su propio identificador): la pantalla del grupo muestra una tarjeta "En vivo" por cada una, salvo la que cuenta la propia persona. Hasta 20 a la vez por grupo.
- En Participantes, un escudo de contorno con una tilde adentro, junto al nombre, marca a los administradores.
- Cada integrante puede cambiar su propio nombre desde el menú "⋯" de su tarjeta en Participantes ("Cambiar nombre"); en ese menú cada integrante ve solo las opciones de su propia tarjeta ("Cambiar nombre" y "Editar apodos"), y los administradores las de todas. Un administrador puede cambiar el nombre de un integrante que todavía nadie eligió; el de quien ya eligió su lugar solo lo cambia esa persona. El nombre se actualiza también en las partidas ya guardadas. Necesita conexión.
- Eliminar a un integrante del grupo (opción "Eliminar del grupo" del menú "⋯" de su tarjeta, con confirmación) lo oculta de la lista sin borrar sus partidas ni sus estadísticas.
- El administrador tendrá acceso a las funciones de administración y podrá cancelar y restaurar partidas del grupo.
- Si el grupo se queda sin administradores (porque el último se fue, fue dado de baja o liberado), el rol pasa automáticamente al integrante con cuenta más antiguo; si ninguno tiene cuenta, al integrante más antiguo.
- Mientras no exista el sistema de cuentas, el dispositivo tendrá una lista local de pertenencia: los grupos que aparecen en la pantalla inicial.
- Un usuario podrá salir de un grupo; al hacerlo, el grupo deja de aparecer en su pantalla inicial (se quita de su lista de pertenencia).
- Salir de un grupo no descuenta las partidas ya jugadas: las partidas jugadas por el usuario siguen contando en su perfil personal aunque el grupo se elimine.
- Al salir de un grupo que está en el servidor, la app avisa al servidor (necesita conexión; sin ella no se sale, para no dejar al integrante vinculado): el integrante queda libre para que otra persona lo elija y deja de ser administrador si lo era.
- Si el usuario que sale es el administrador y quedan otros integrantes, la administración pasa a otro integrante (el integrante con cuenta más antiguo, salvo que quede otro administrador) y el grupo se conserva en el servidor con sus partidas y estadísticas. El integrante que representaba al usuario queda en el grupo (desvinculado) para que sus estadísticas sigan mostrándose a los demás.
- Al salir, el grupo se quita del celular de quien sale: si vuelve a entrar con el enlace de invitación, la app le pide elegir de nuevo a qué integrante se vincula (y sus apodos), igual que la primera vez.
- Si el usuario que sale es el administrador y era el único integrante, el grupo se elimina completo (historial y estadísticas de grupo), tras un aviso que advierte que se borrarán esas estadísticas. Las partidas ya jugadas se conservan para el perfil personal.

### 3.4. Pantalla principal

- La pantalla inicial mostrará los grupos de la lista de pertenencia del dispositivo; al salir de un grupo, este deja de mostrarse.
- La pantalla inicial permitirá iniciar una partida rápida, sin grupo ni integrantes.
- La pantalla de un grupo ofrecerá la opción de salir del grupo.
- Cada grupo se presenta como una tarjeta con borde redondeado y margen a los costados (no de borde a borde, para que se note que es un botón). Empieza con una banda negra con letra crema: a la izquierda el nombre del grupo (lo más grande) y a la derecha la posición de la persona y una flecha ">" que indica que se puede tocar. Debajo, sobre fondo crema: en una línea "N integrantes · M partidas jugadas" y, a la derecha de esa misma línea, la nube tachada con la cantidad de partidas sin enviar (solo si hay); los avatares de los 8 primeros del ranking de puntos, en orden y sin contador de "+N", con los puntos de la persona a la derecha ("105 Pts", en tamaño menor al nombre); y "Última partida: ayer 21:30" (día y hora, sin el resultado; "Sin partidas todavía" si no hay).
- La posición va en la banda negra: con un trofeo dorado, plateado o de bronce si es 1º, 2º o 3º, y solo el número ("5º") del cuarto lugar en adelante. Sin partidas no hay posición ni puntos.
- Si el grupo tiene partidas sin enviar, la nube tachada con la cantidad aparece junto al nombre.
- Al seleccionar un grupo, se accederá a su historial de partidas. Las estadísticas y los participantes se consultan con botones de icono del sector superior, que llevan a sus propias pantallas.
- La pantalla de estadísticas del grupo permitirá alternar entre estadísticas grupales, individuales y enfrentamientos. El sector superior se separa de las pestañas por una línea horizontal, y la pestaña activa se distingue solo por la inversión de colores.
- Los enfrentamientos se muestran como una grilla simétrica: cada fila y cada columna corresponde a un integrante y cada celda, al resultado entre ambos.
- La pantalla de participantes no muestra estadísticas: es una lista de botones, uno por integrante, con su foto y su nombre sobre una tarjeta con margen y un bloque negro con ">" a la derecha. Al tocar uno se abre su ficha; las estadísticas de cada uno están en la pestaña de estadísticas individuales.
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
- Los cuadrados tienen las esquinas rectas (sin redondear) y un trazo firme (6 px). Al sumar un punto, el trazo nuevo se dibuja de un extremo al otro en menos de una quinta de segundo; no se anima al abrir una partida que ya tenía puntos, al deshacer ni si el dispositivo pide reducir las animaciones.
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
- En la lista del historial, cada partida ya enviada muestra un botón "⋯" con la opción "Ver historial" (para cualquier integrante) y, si la persona tiene permiso, "Cancelar partida" o "Restaurar partida".
- "Ver historial" abre una ventana con todo lo que pasó con la partida, del más antiguo al más reciente: cuándo y quién la registró y cada cancelación o restauración (quién, cuándo y el motivo). Necesita conexión.
- Al cancelar se puede escribir un motivo, que es opcional (hasta 200 caracteres).
- Cancelar y restaurar una partida ya enviada necesitan conexión, porque el servidor valida los permisos. Una partida que todavía no se envió se puede cancelar y restaurar sin conexión: queda marcada así en el celular y, cuando hay conexión, sube ya cancelada como cualquier otra (si el servidor no permite la cancelación, queda como diga el servidor).
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
- Quien cuenta puede cancelar la partida que está contando desde el menú de las tres rayas del contador ("Cancelar partida", solo si ya hay puntos). Aparece un cartel "¿Cancelar la partida?" con "Quedará cancelada en el historial.", un campo "Motivo (opcional)" y los botones "Cancelar partida" y "Seguir jugando". En una partida de grupo queda en el historial como cancelada, con el marcador que tenía (aunque esté empatada o no haya llegado al objetivo), y no cuenta para puntos ni estadísticas; la partida rápida simplemente se descarta (el cartel dice "Se borrará el marcador."). Solo quien la cuenta puede cancelarla. Si no hay conexión, la cancelación queda guardada y se envía cuando vuelva.
- La partida podrá pausarse: pausar solo detiene el timer. No aparece ningún aviso ni se bloquea nada; se puede seguir usando el contador y navegar por la app.
- Una partida pausada se reanuda con el botón del timer o al sumar puntos. Deshacer no la reanuda.
- Si el contador se cierra (o la app pasa a segundo plano) sin pausar, la partida se pausa sola 60 segundos después de la última vez que estuvo abierto, para que no quede corriendo el tiempo mientras nadie juega. Al volver dentro de esos 60 segundos sigue corriendo normalmente.
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
- Cada partida es una fila de ancho completo bajo la banda negra de su día, con una barra vertical negra a la izquierda. Lo único que lleva arriba es la tarjeta: un recuadro con contorno que une a los equipos con sus puntajes (a la izquierda un renglón por equipo, divididos por una línea fina, con avatares y nombres: ganador en negrita, perdedor atenuado; a la derecha el bloque negro con los dos puntajes en crema, separados por una línea fina crema, cada uno a la altura de su equipo). No se muestran la modalidad ni el objetivo. Debajo de la tarjeta, una única línea con la hora, la duración y, si corresponde, "Sin enviar" o "Cancelada"; a la derecha de esa misma línea van los puntos que la persona sumó o restó ("+12 Pts", "−8 Pts") y el menú de opciones. Solo el motivo de una cancelación, por ser largo, va en una línea aparte.
- El motivo de una partida cancelada se muestra en una línea debajo de la partida.
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

En la pestaña individual se comparan los integrantes mediante un ranking ordenado por puntos (con los mismos desempates que el podio), que muestra también el porcentaje de victorias de cada uno; al tocar el nombre de un integrante se accede a su ficha individual con el detalle de estos datos.

### 6.3. Enfrentamientos

Tabla donde se consulta, para cada integrante contra cada uno del resto del grupo:

- Cantidad de partidas jugadas entre ambos.
- Porcentaje de victorias de cada uno contra el otro.

Se presenta como una grilla simétrica: el eje de filas muestra los nombres y el eje de columnas, las fotos de perfil; cada celda, el resultado entre ambos.

### 6.4. Sistema de puntos (Pts)

Cada integrante acumula puntos (Pts) dentro de cada grupo, según los resultados de las partidas de grupo. **Todos empiezan en 0.** Los puntos se calculan a partir de las partidas ya guardadas, procesándolas en orden cronológico (de la más antigua a la más reciente). Los Pts solo se calculan para partidas de grupo, porque las partidas rápidas no tienen integrantes asociados, y los jugadores invitados no suman ni restan.

La idea: **cada integrante suma al ganar y resta al perder según SUS PROPIOS puntos.** Con pocos puntos, las victorias valen mucho y las derrotas casi nada, así que se sube rápido al principio. A medida que se acerca a su nivel, lo que suma y lo que resta se emparejan. Con muchos puntos, las derrotas pesan más que las victorias, pero nunca más del doble. Por eso los puntos de cada uno se acomodan en una **meseta** que depende de cuánto gana: un jugador parejo (gana la mitad de sus partidas) se acomoda cerca de los **1500**.

**Constantes**

| Nombre | Valor | Qué es |
|---|---|---|
| Puntos de inicio | 0 | Con lo que empieza todo integrante. |
| Meseta | 1500 | Donde se acomoda un jugador parejo. |
| Base | 30 | Lo que suma una victoria a 30 puntos, con diferencia media, contra un rival parejo, a quien está en la meseta. |
| Victoria en 0 puntos | × 4,5 | Cuánto más vale una victoria cuando se tienen 0 puntos. |
| Derrota en 0 puntos | × 0,25 | Cuánto resta una derrota cuando se tienen 0 puntos. |
| Techo | 2250 puntos (1,5 veces la meseta) | Desde acá los factores dejan de cambiar. |
| Victoria desde el techo | × 0,7 | Cuánto vale una victoria desde los 2250. |
| Derrota desde el techo | × 1,4 | Cuánto resta una derrota desde los 2250. |

**Cómo se calcula una partida**

1. Se calcula el tamaño de la partida: `30 × factor de objetivo × factor de diferencia`.
   - Factor de objetivo: `objetivo / 30`, entre 0,5 y 1,5 (a 40 puntos mueve 1,33 veces; a 15 o menos, la mitad).
   - Factor de diferencia: `0,75 + 0,5 × diferencia / objetivo`, de 0,75 (ganar muy ajustado) a 1,25 (golear por todo el objetivo).
2. Cada integrante del equipo ganador **suma** `tamaño × factor de victoria × ajuste por el rival`. El factor de victoria depende de sus puntos: × 4,5 en 0, × 1 en 1500 y × 0,7 desde 2250; entre un valor y otro baja de forma pareja.
3. Cada integrante del equipo perdedor **resta** `tamaño × factor de derrota × ajuste por el rival`. El factor de derrota depende de sus puntos: × 0,25 en 0, × 1 en 1500 y × 1,4 desde 2250; entre un valor y otro sube de forma pareja.
4. Ajuste por el rival (diferencia entre el promedio de puntos de los dos equipos, cada 4000 puntos de diferencia ajustan 100%, con tope de 25%): si el rival tiene más puntos, ganarle vale hasta 25% más y perderle resta hasta 25% menos; si tiene menos, ganarle vale hasta 25% menos y perderle resta hasta 25% más.
5. Los resultados se redondean. **No hay puntos negativos:** nadie baja de 0. Si alguien con 0 puntos pierde, queda en 0 (y en el historial no se le muestra ningún cambio en esa partida); si tiene pocos puntos y la derrota le restaría más de los que tiene, queda en 0.

**Cuánto mueve una partida a 30 puntos con diferencia media y rival parejo**

| Puntos que ya tiene | Gana | Pierde | Victorias para compensar una derrota |
|---|---|---|---|
| 0 | +135 | −8 | casi nada que compensar |
| 300 | +114 | −12 | 0,1 |
| 750 | +83 | −19 | 0,2 |
| 1200 | +51 | −24 | 0,5 |
| 1500 (meseta) | +30 | −30 | 1 |
| 1800 | +26 | −35 | 1,3 |
| 2250 o más | +21 | −42 | 2 |

**Qué se espera de este sistema**

- Un jugador parejo sube rápido al principio y se acomoda cerca de los 1500: aproximadamente 1300 después de 60 partidas propias y 1450 después de 100.
- Dónde se acomoda cada uno según cuánto gana (aproximado): 30% de victorias, unos 1100; 40%, unos 1350; 50%, 1500; 55%, unos 1700; 60%, unos 1950; 67%, 2250 (el techo). Quien gana más del 67% de sus partidas sigue subiendo, aunque despacio.
- Al que está arriba le sigue valiendo la pena ganar: nunca le hacen falta más de dos victorias para compensar una derrota, y ganarle a alguien con pocos puntos siempre suma algo claro.
- Todos los números se pueden retocar en un solo lugar (las constantes de `src/features/matches/points.ts`).
- Los puntos se recalculan siempre desde las partidas: si se cancela o se restaura una partida, o se corrige un apodo, todo se recalcula.

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

Cada partida de grupo se cuenta desde el equipo del integrante de la persona (también si la anotaron con un apodo): gana si ganó su equipo. Las partidas de grupo en las que no jugó no cuentan.

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

trucoStats tendrá un funcionamiento offline-first.

- La aplicación podrá abrirse sin Internet después de haberse instalado y preparado correctamente.
- Permitirá iniciar partidas utilizando integrantes del grupo previamente almacenados en el dispositivo.
- Permitirá contar puntos mediante botones y gestos.
- Permitirá finalizar partidas y guardar sus resultados localmente.
- Permitirá consultar el historial y las estadísticas disponibles en el dispositivo.
- Los datos pendientes se sincronizarán cuando vuelva a existir conexión.
- La sincronización se intentará al recuperar la conexión y al volver a abrir la aplicación. Mientras la pantalla de un grupo está abierta, además, se sincroniza cada 10 segundos y al volver a la app desde otra, para ver las partidas que registraron los demás.
- Se mostrará claramente si existen partidas pendientes de sincronización. Si no se pueden enviar, la pantalla del grupo dice por qué (sin sesión, cuenta sin vincular a un integrante, servidor sin respuesta o sin conexión) y ofrece "Reintentar"; un fallo nunca pasa en silencio.
- Los cambios del grupo (nombres, fotos, integrantes, apodos) se traen aunque las partidas no se puedan traer.
- Si la foto propia no llega al servidor (sin conexión o sin vínculo), la app lo avisa, la conserva en el celular y reintenta enviarla en cada sincronización sin que lo que dice el servidor la pise.
- No se dependerá exclusivamente de sincronización automática en segundo plano.

Cada partida tendrá un único anotador responsable para evitar modificaciones simultáneas desde distintos dispositivos.

## 8. Seguridad y auditoría

- Cada usuario tendrá una identidad única.
- Cada grupo tendrá al menos un administrador.
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
- **Funcionamiento offline:** Service Worker. Guarda solo los archivos de la app; los datos del servidor (`/api`) nunca se guardan en caché ni se responden desde ella.
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

### 12.11. Bandas, bloques y tarjetas

- El contraste entre zonas oscuras (negro con letra crema) y claras es parte de la identidad: cada pantalla tiene al menos una banda o bloque negro; no se diseña todo en crema y gris.
- Cada sección de un formulario es una tarjeta con margen a los costados, borde redondeado y una banda negra de título con letra crema. Las pantallas de estadísticas (estadísticas del grupo, ficha del integrante y perfil) van de borde a borde: las pestañas y las secciones ocupan todo el ancho; solo los totales (los bloques negros con cifras) son bloques con margen, en todas ellas.
- La ficha del integrante y el perfil se arman igual: la foto arriba y centrada; debajo, el anillo del porcentaje de victorias junto a los bloques de victorias y jugadas; las derrotas van en la lista de abajo.
- Los elementos que se tocan (grupos, participantes) tienen forma de botón: tarjeta con margen y una flecha ">" sobre fondo negro; no ocupan el ancho completo de la pantalla.
- Las cifras principales (victorias, derrotas, jugadas, partidas, promedio) van en bloques negros con el número grande en crema y la etiqueta en mayúsculas.
- Las pestañas ocupan todo el ancho, con la misma separación de la barra superior que las demás zonas: la activa va en crema y las demás en negro, y la activa lleva una línea negra arriba y abajo que la separa del crema que la rodea, y las líneas verticales entre las pestañas inactivas ocupan todo el alto de la barra.
- En el podio, todos los escalones son negros y se apoyan en la base de su tarjeta (no flotan).
- La posición en un ranking se muestra en un cuadro negro con el número en crema.
- Los grosores de línea siguen una jerarquía de tres niveles y no se usan otros: **3 px** para las divisiones estructurales entre zonas negras grandes (entre la barra superior, las pestañas y las bandas de título, y los separadores verticales de la barra superior y de las pestañas); **2 px** para contornos (tarjetas, recuadros, botones, controles); **1 px** para las divisiones finas dentro de una zona (filas de listas, separación entre equipos y entre puntajes, celdas y separadores de la grilla de enfrentamientos, donde las divisiones entre columnas y entre filas miden lo mismo y llegan de borde a borde).
- En los récords de partidas (estadísticas) cada récord muestra su título y su dato (duración o diferencia) en la misma línea y con la misma letra; debajo va la misma tarjeta de partida del historial y, debajo de ella, solo la fecha.
- Todos los títulos de récords (partidas, integrantes y equipos) usan la misma letra negra en mayúsculas, y lo que va debajo de cada título lleva al costado la misma barra negra vertical que las partidas.
- El control de cantidad (− y +) va centrado en su sección.

---

**Estado:** Requisitos funcionales en elaboración.

**Objetivo de desarrollo:** construir una aplicación funcional mientras se adquiere experiencia con TypeScript, React, SQL, Git y desarrollo web.
