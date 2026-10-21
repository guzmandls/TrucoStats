import { createGroup, getGroupByInviteCode, type Env } from './groups'
import { errorResponse, json } from './http'
import { addMember, releaseMember, removeMember, setMemberAdmin } from './admin'
import { setAliases } from './aliases'
import { updateMember } from './members'
import { cancelMatch, restoreMatch } from './cancel'
import { matchHistory } from './history'
import { joinGroup } from './join'
import { leaveGroup } from './leave'
import { createMatch, listMatches } from './matches'
import { currentUser, login, logout, register } from './users'

const GROUP_BY_CODE = /^\/api\/grupos\/([0-9a-f]{32})$/
const MEMBER_OF_GROUP =
  /^\/api\/grupos\/([0-9a-f]{32})\/integrantes\/([^/]{1,100})$/
const MEMBERS_OF_GROUP = /^\/api\/grupos\/([0-9a-f]{32})\/integrantes$/
const MEMBER_ACTION =
  /^\/api\/grupos\/([0-9a-f]{32})\/integrantes\/([^/]{1,100})\/(liberar|administrador|apodos)$/
const MATCHES_OF_GROUP = /^\/api\/grupos\/([0-9a-f]{32})\/partidas$/
const MATCH_ACTION =
  /^\/api\/grupos\/([0-9a-f]{32})\/partidas\/([^/]{1,100})\/(cancelar|restaurar)$/
const MATCH_HISTORY =
  /^\/api\/grupos\/([0-9a-f]{32})\/partidas\/([^/]{1,100})\/historial$/
const LEAVE_GROUP = /^\/api\/grupos\/([0-9a-f]{32})\/salir$/
const JOIN_GROUP = /^\/api\/grupos\/([0-9a-f]{32})\/unirse$/

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
      return getGroupByInviteCode(byCode[1], request, env)
    }

    const matchesOfGroup = MATCHES_OF_GROUP.exec(pathname)
    if (matchesOfGroup) {
      if (request.method === 'POST') {
        return createMatch(matchesOfGroup[1], request, env)
      }
      if (request.method === 'GET') {
        return listMatches(matchesOfGroup[1], request, env)
      }
      return errorResponse('Método no permitido', 405)
    }

    const historyOfMatch = MATCH_HISTORY.exec(pathname)
    if (historyOfMatch) {
      return request.method === 'GET'
        ? matchHistory(
            historyOfMatch[1],
            decodeURIComponent(historyOfMatch[2]),
            request,
            env,
          )
        : errorResponse('Método no permitido', 405)
    }

    const matchAction = MATCH_ACTION.exec(pathname)
    if (matchAction) {
      if (request.method !== 'POST') {
        return errorResponse('Método no permitido', 405)
      }
      const [, code, matchId, action] = matchAction
      const id = decodeURIComponent(matchId)
      return action === 'cancelar'
        ? cancelMatch(code, id, request, env)
        : restoreMatch(code, id, request, env)
    }

    const leaveOfGroup = LEAVE_GROUP.exec(pathname)
    if (leaveOfGroup) {
      return request.method === 'POST'
        ? leaveGroup(leaveOfGroup[1], request, env)
        : errorResponse('Método no permitido', 405)
    }

    const joinOfGroup = JOIN_GROUP.exec(pathname)
    if (joinOfGroup) {
      return request.method === 'POST'
        ? joinGroup(joinOfGroup[1], request, env)
        : errorResponse('Método no permitido', 405)
    }

    const membersOfGroup = MEMBERS_OF_GROUP.exec(pathname)
    if (membersOfGroup) {
      return request.method === 'POST'
        ? addMember(membersOfGroup[1], request, env)
        : errorResponse('Método no permitido', 405)
    }

    const memberAction = MEMBER_ACTION.exec(pathname)
    if (memberAction) {
      const [, code, memberId, action] = memberAction
      const id = decodeURIComponent(memberId)
      if (action === 'liberar' && request.method === 'POST') {
        return releaseMember(code, id, request, env)
      }
      if (action === 'apodos' && request.method === 'PUT') {
        return setAliases(code, id, request, env)
      }
      if (action === 'administrador' && request.method === 'PUT') {
        return setMemberAdmin(code, id, request, env)
      }
      return errorResponse('Método no permitido', 405)
    }

    const memberOfGroup = MEMBER_OF_GROUP.exec(pathname)
    if (memberOfGroup) {
      const code = memberOfGroup[1]
      const id = decodeURIComponent(memberOfGroup[2])
      if (request.method === 'PATCH') {
        return updateMember(code, id, request, env)
      }
      if (request.method === 'DELETE') {
        return removeMember(code, id, request, env)
      }
      return errorResponse('Método no permitido', 405)
    }

    return errorResponse('No encontrado', 404)
  },
}
