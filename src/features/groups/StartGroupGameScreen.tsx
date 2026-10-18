import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { loadGroups } from './groupsStorage'
import type { Group } from './types'

type TeamSide = 'nos' | 'ellos'

export function StartGroupGameScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [target, setTarget] = useState(30)
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

  const start = () => {
    if (nos.length === 0 || ellos.length === 0) {
      return
    }
    const state = {
      type: 'group' as const,
      groupId: group.id,
      target,
      nos,
      ellos,
    }
    navigate('/partida', { state })
  }

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
              const v = Number(event.target.value)
              if (!Number.isNaN(v)) {
                setTarget(v)
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
      <button
        type="button"
        onClick={start}
        disabled={nos.length === 0 || ellos.length === 0}
      >
        Comenzar
      </button>
      <button type="button" onClick={() => navigate(`/grupo/${group.id}`)}>
        Volver
      </button>
    </div>
  )
}
