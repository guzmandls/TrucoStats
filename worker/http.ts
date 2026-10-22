// no-store: los datos cambian todo el tiempo y dependen de quién pide; ningún
// navegador ni caché intermedia debe guardarlos.
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  })
}

export function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status)
}

// Si cambia la forma de las respuestas con versión, se sube este número para que
// ningún celular se quede con una respuesta vieja.
const FORMAT = 1

// Etiqueta de versión (ETag) de lo que el celular pide seguido (el grupo y sus
// partidas). Cambia cuando cambia el grupo (su versión, ver la migración 0010) o
// quién pregunta (la respuesta dice qué integrante es cada uno).
export function versionTag(revision: number, userId: string | null): string {
  return `W/"${FORMAT}-${revision}-${userId ?? 'anonimo'}"`
}

// Si el celular ya tiene esa versión, se responde 304 ("sin cambios") sin
// cuerpo: no hace falta leer ni mandar nada más.
export function unchanged(request: Request, tag: string): Response | null {
  if (request.headers.get('if-none-match') !== tag) {
    return null
  }
  return new Response(null, {
    status: 304,
    headers: { etag: tag, 'cache-control': 'no-store' },
  })
}
