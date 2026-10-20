# Instrucciones para asistentes de IA — TrucoStats

## Contexto del proyecto
TrucoStats es una PWA para contar puntos de truco uruguayo, guardar partidas y consultar estadísticas.

- Leer `docs/requisitos.md` antes de proponer o implementar funcionalidades.
- Los requisitos documentados son la referencia principal del proyecto.
- No inventar funcionalidades ni modificar requisitos sin autorización.

## Tecnologías
- React + TypeScript.
- Cloudflare Workers + D1 (SQL).
- IndexedDB y Service Worker para funcionamiento offline.
- Git y GitHub para control de versiones.
- Priorizar soluciones gratuitas.

## Forma de trabajo
- El desarrollador está aprendiendo desarrollo web y herramientas profesionales.
- Explicar brevemente las decisiones técnicas y sus motivos.
- Favorecer soluciones simples, mantenibles y bien organizadas.
- Dividir el desarrollo en tareas pequeñas y verificables.
- No modificar archivos ni ejecutar comandos sin autorización explícita (excepto `docs/desarrollo.md`, ver "Documentación").
- No implementar funcionalidades adicionales a las solicitadas.
- Proponer pruebas para verificar cada implementación.
- Seguir un flujo de Git con ramas y commits descriptivos.
- No realizar commits ni push automáticamente.
- Ante dudas sobre los requisitos, preguntar antes de implementar.

## Documentación
- `docs/desarrollo.md` es el diario de aprendizaje del proyecto: etapas hechas y conceptos nuevos con su porqué (qué es, para qué se usa, por qué se eligió).
- Actualizar `docs/desarrollo.md` al terminar cada tarea, sin pedir autorización.
- Mantenerlo conciso, sencillo y legible: ideas cortas, sin jerga innecesaria.
- Los requisitos (`docs/requisitos.md`) cambian seguido: proponer los cambios y esperar aprobación antes de escribirlos.
- Si el código y los requisitos se contradicen, el código actual es la referencia; avisar y proponer actualizar los requisitos.

## Git (el desarrollador quiere aprender)
- Antes de cambiar de rama, hacer push, abrir un pull request, mergear o similar, indicar los comandos exactos y explicar por qué se usan.
- Ejecutarlos solo si el desarrollador lo autoriza explícitamente.
- No agregar líneas `Co-Authored-By` ni otra atribución de IA en commits ni en pull requests.
- Una rama por funcionalidad. Tras mergear un pull request: actualizar `main` (`git checkout main`, `git pull`), borrar la rama en origin (`git push origin --delete <rama>`) y en local (`git branch -d <rama>`), y limpiar referencias con `git fetch --prune`. No dejar ramas obsoletas.
- No borrar una rama antes de mergear su pull request.