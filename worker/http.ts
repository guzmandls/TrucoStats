// no-store: los datos cambian todo el tiempo y dependen de quién pide; ningún
// navegador ni caché intermedia debe guardarlos.
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status)
}
