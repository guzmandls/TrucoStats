import { createGroup, getGroupByInviteCode, type Env } from './groups'
import { errorResponse, json } from './http'

const GROUP_BY_CODE = /^\/api\/grupos\/([0-9a-f]{32})$/

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (pathname === '/api/salud') {
      return json({ estado: 'ok' })
    }

    if (pathname === '/api/grupos') {
      if (request.method !== 'POST') {
        return errorResponse('Método no permitido', 405)
      }
      return createGroup(request, env)
    }

    const byCode = GROUP_BY_CODE.exec(pathname)
    if (byCode) {
      if (request.method !== 'GET') {
        return errorResponse('Método no permitido', 405)
      }
      return getGroupByInviteCode(byCode[1], env)
    }

    return errorResponse('No encontrado', 404)
  },
}
