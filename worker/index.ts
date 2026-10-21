import { createGroup, getGroupByInviteCode, type Env } from './groups'
import { errorResponse, json } from './http'
import { updateMember } from './members'
import { createMatch, listMatches } from './matches'
import { currentUser, login, logout, register } from './users'

const GROUP_BY_CODE = /^\/api\/grupos\/([0-9a-f]{32})$/
const MEMBER_OF_GROUP =
  /^\/api\/grupos\/([0-9a-f]{32})\/integrantes\/([^/]{1,100})$/
const MATCHES_OF_GROUP = /^\/api\/grupos\/([0-9a-f]{32})\/partidas$/

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (pathname === '/api/salud') {
      return json({ estado: 'ok' })
    }

    if (pathname === '/api/registro') {
      return request.method === 'POST'
        ? register(request, env)
        : errorResponse('Método no permitido', 405)
    }

    if (pathname === '/api/sesion') {
      if (request.method === 'POST') {
        return login(request, env)
      }
      if (request.method === 'DELETE') {
        return logout(request, env)
      }
      return errorResponse('Método no permitido', 405)
    }

    if (pathname === '/api/yo') {
      return request.method === 'GET'
        ? currentUser(request, env)
        : errorResponse('Método no permitido', 405)
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

    const matchesOfGroup = MATCHES_OF_GROUP.exec(pathname)
    if (matchesOfGroup) {
      if (request.method === 'POST') {
        return createMatch(matchesOfGroup[1], request, env)
      }
      if (request.method === 'GET') {
        return listMatches(matchesOfGroup[1], env)
      }
      return errorResponse('Método no permitido', 405)
    }

    const memberOfGroup = MEMBER_OF_GROUP.exec(pathname)
    if (memberOfGroup) {
      if (request.method !== 'PATCH') {
        return errorResponse('Método no permitido', 405)
      }
      return updateMember(
        memberOfGroup[1],
        decodeURIComponent(memberOfGroup[2]),
        request,
        env,
      )
    }

    return errorResponse('No encontrado', 404)
  },
}
