import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clearGame, gameSlot } from '../counter/gameStorage'
import type { GameContext } from '../counter/gameContext'
import { clampTarget } from '../counter/useCounter'
import type { Modality, Participant } from '../matches/types'
import { loadGroups } from './groupsStorage'
import type { Group } from './types'

type TeamSide = 'nos' | 'ellos'

const DEFAULT_TARGETS: Record<Modality, number> = {
  '1v1': 20,
  '2v2': 30,
  '3v3': 40,
}

function modalityOf(count: number): Modality | null {
  if (count === 1) {
    return '1v1'
  }
  if (count === 2) {
    return '2v2'
  }
  if (count === 3) {
    return '3v3'
  }
  return null
}

export function StartGroupGameScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [targetOverride, setTargetOverride] = useState<number | null>(null)
  const [nos, setNos] = useState<string[]>([])
  const [ellos, setEllos] = useState<string[]>([])

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

  const members = group?.members ?? []
  const selected = useMemo(() => new Set([...nos, ...ellos]), [nos, ellos])

  const teamsAreValid =
    nos.length > 0 && nos.length === ellos.length && nos.length <= 3
  const modality = teamsAreValid ? modalityOf(nos.length) : null
  const target =
    targetOverride ??
    (modality ? DEFAULT_TARGETS[modality] : DEFAULT_TARGETS['2v2'])

  if (!group) {
    return <div>Cargando...</div>
  }

  const toggleMember = (memberId: string, side: TeamSide) => {
    if (selected.has(memberId)) {
      setNos((prev) => prev.filter((m) => m !== memberId))
      setEllos((prev) => prev.filter((m) => m !== memberId))
      return
    }
    if (side === 'nos') {
      setNos((prev) => [...prev, memberId])
    } else {
      setEllos((prev) => [...prev, memberId])
    }
  }

  const start = async () => {
    if (!teamsAreValid || !modality) {
      return
    }
    const pick = (ids: string[]): Participant[] =>
      ids.flatMap((memberId) => {
        const member = members.find((m) => m.id === memberId)
        return member ? [{ id: member.id, name: member.name }] : []
      })
    const gameContext: GameContext = {
      type: 'group',
      groupId: group.id,
      modality,
      teams: { nos: pick(nos), ellos: pick(ellos) },
    }
    await clearGame(gameSlot(gameContext))
    navigate('/partida', { state: { gameContext, target } })
  }

  const problem = teamsAreValid
    ? null
    : nos.length > 3 || ellos.length > 3
      ? 'Cada equipo puede tener hasta 3 integrantes.'
      : nos.length === 0 || ellos.length === 0
        ? 'Elegí al menos un integrante en cada equipo.'
        : 'Los dos equipos deben tener la misma cantidad de integrantes.'

  return (
    <div>
      <h1>Iniciar partida - {group.name}</h1>
      <div>
        <label>
          Objetivo
          <input
            type="number"
            min={10}
            max={100}
            step={5}
            value={target}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (!Number.isNaN(value)) {
                setTargetOverride(clampTarget(value))
              }
            }}
          />
        </label>
      </div>
      <h2>Integrantes</h2>
      <ul>
        {members.map((member) => {
          const inNos = nos.includes(member.id)
          const inEllos = ellos.includes(member.id)
          return (
            <li key={member.id}>
              <span>{member.name}</span>
              <button
                type="button"
                onClick={() => toggleMember(member.id, 'nos')}
              >
                {inNos ? 'Quitar de Nosotros' : 'Agregar a Nosotros'}
              </button>
              <button
                type="button"
                onClick={() => toggleMember(member.id, 'ellos')}
              >
                {inEllos ? 'Quitar de Ellos' : 'Agregar a Ellos'}
              </button>
            </li>
          )
        })}
      </ul>
      {problem && <p role="alert">{problem}</p>}
      <button type="button" onClick={start} disabled={!teamsAreValid}>
        Comenzar
      </button>
      <button type="button" onClick={() => navigate(`/grupo/${group.id}`)}>
        Volver
      </button>
    </div>
  )
}
