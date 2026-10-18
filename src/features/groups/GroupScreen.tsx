import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  contextOf,
  gameScore,
  groupSlot,
  hasMoves,
  loadGame,
  type PersistedGame,
} from '../counter/gameStorage'
import { matchMeta, matchTitle } from '../matches/format'
import { loadMatches } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { loadGroups } from './groupsStorage'
import type { Group } from './types'

export function GroupScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [game, setGame] = useState<PersistedGame | null>(null)

  useEffect(() => {
    let active = true
    void loadGroups().then((groups) => {
      if (!active) {
        return
      }
      const found = groups.find((g) => g.id === id)
      if (found) {
        setGroup(found)
      } else {
        navigate('/')
      }
    })
    return () => {
      active = false
    }
  }, [id, navigate])

  useEffect(() => {
    if (!group) {
      return
    }
    let active = true
    void loadGame(groupSlot(group.id)).then((stored) => {
      if (active) {
        setGame(stored)
      }
    })
    return () => {
      active = false
    }
  }, [group])

  useEffect(() => {
    if (!group) {
      return
    }
    let active = true
    void loadMatches().then((all) => {
      if (!active) {
        return
      }
      const own = all
        .filter((match) => match.groupId === group.id)
        .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
      setMatches(own)
    })
    return () => {
      active = false
    }
  }, [group])

  if (!group) {
    return <div>Cargando...</div>
  }

  const inProgress = game && hasMoves(game) ? game : null
  const score = inProgress ? gameScore(inProgress) : null

  return (
    <div>
      <h1>{group.name}</h1>
      {inProgress && score ? (
        <div>
          <Link
            to="/partida"
            state={{
              gameContext: contextOf(inProgress),
              target: inProgress.target,
            }}
          >
            Continuar partida · {score.nos} – {score.ellos}
          </Link>
        </div>
      ) : (
        <div>
          <Link to={`/partida-grupo/${group.id}`}>Iniciar partida</Link>
        </div>
      )}
      <div>
        <Link to="/">Volver al inicio</Link>
      </div>
      <h2>Integrantes</h2>
      <ul>
        {group.members.map((member) => (
          <li key={member.id}>{member.name}</li>
        ))}
      </ul>
      <h2>Historial de partidas</h2>
      {matches.length === 0 ? (
        <p>Todavía no hay partidas</p>
      ) : (
        <ul data-testid="historial">
          {matches.map((match) => (
            <li key={match.id}>
              <div>{matchTitle(match)}</div>
              <div>{matchMeta(match)}</div>
            </li>
          ))}
        </ul>
      )}
      <div>
        <p>Estadísticas (próximamente)</p>
      </div>
    </div>
  )
}
