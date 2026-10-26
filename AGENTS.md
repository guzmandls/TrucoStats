# Instrucciones para asistentes de IA — trucoStats

## Contexto del proyecto
trucoStats es una PWA para contar puntos de truco uruguayo, guardar partidas y consultar estadísticas.

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
- Se pueden hacer commits al terminar una tarea, y se avisa al desarrollador qué se commiteó y con qué mensaje. Push, pull requests y merges siguen la sección Git.
- Ante dudas sobre los requisitos, preguntar antes de implementar.

## Documentación
- `docs/desarrollo.md` es el diario de aprendizaje del proyecto, ordenado por tema: conceptos nuevos con su porqué (qué es, para qué se usa, por qué se eligió), tecnologías (base de datos, SQL, Cloudflare, etc.) y decisiones importantes.
- Se escribe en forma impersonal ("se usó", "se prefirió", "se configuró"), sin referirse a nadie: ni en primera persona ("usé"), ni al desarrollador ("él"), ni a la IA, ni a nadie que dé o reciba indicaciones.
- Solo va lo importante: conceptos y técnicas nuevas, cambios de arquitectura, decisiones y lecciones. No se registran pasos irrelevantes (ajustes de diseño o de textos, cosas que se probaron y se descartaron, pruebas hechas en cada tarea).
- Actualizarlo al terminar una tarea solo si aporta algo de eso, sin pedir autorización, agregándolo en la sección del tema que corresponda.
- Mantenerlo conciso, sencillo y legible: ideas cortas, sin jerga innecesaria.
- Los requisitos (`docs/requisitos.md`) cambian seguido. Lo que el desarrollador pide tiene más jerarquía que lo escrito en los requisitos.
- Si un pedido del desarrollador difiere de los requisitos, actualizar `docs/requisitos.md` para reflejarlo, sin pedir permiso, y avisar qué se cambió.
- Los cambios que proponga la IA por iniciativa propia (reglas nuevas, funcionalidades no pedidas) se proponen y esperan aprobación antes de escribirse.
- Si el código y los requisitos se contradicen, el código actual es la referencia; actualizar los requisitos y avisar.

## Git (el desarrollador quiere aprender)
- Antes de cambiar de rama, hacer push, abrir un pull request, mergear o similar, indicar los comandos exactos y explicar por qué se usan.
- Ejecutar push, pull requests, merges y borrado de ramas solo si el desarrollador lo autoriza explícitamente. Los commits y `git add` locales no lo requieren.
- No agregar líneas `Co-Authored-By` ni otra atribución de IA en commits ni en pull requests.
- Una rama por funcionalidad. Tras mergear un pull request: actualizar `main` (`git checkout main`, `git pull`), borrar la rama en origin (`git push origin --delete <rama>`) y en local (`git branch -d <rama>`), y limpiar referencias con `git fetch --prune`. No dejar ramas obsoletas.
- No borrar una rama antes de mergear su pull request.