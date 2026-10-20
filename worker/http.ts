const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status)
}
