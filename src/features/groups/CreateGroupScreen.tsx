import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Group, Member } from './types'
import { saveGroup } from './groupsStorage'

function createId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

export function CreateGroupScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [count, setCount] = useState(2)
  const [members, setMembers] = useState<Member[]>([
    { id: createId(), name: '' },
    { id: createId(), name: '' },
  ])

  const handleCountChange = (newCount: number) => {
    const nextCount = Math.max(1, Math.min(15, newCount))
    setCount(nextCount)
    setMembers((prev) => {
      const next: Member[] = []
      for (let i = 0; i < nextCount; i += 1) {
        next.push(prev[i] ?? { id: createId(), name: '' })
      }
      return next
    })
  }

  const handleMemberNameChange = (index: number, newName: string) => {
    setMembers((prev) => {
      const next = prev.slice()
      if (next[index]) {
        next[index] = { ...next[index], name: newName }
      }
      return next
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const now = new Date().toISOString()
    const adminId = members[0]?.id ?? createId()
    const group: Group = {
      id: createId(),
      name: name.trim() || 'Grupo',
      members,
      adminMemberId: adminId,
      createdAt: now,
    }
    await saveGroup(group)
    navigate('/')
  }

  return (
    <div>
      <h1>Crear grupo</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Nombre del grupo
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Cantidad de integrantes
            <input
              type="number"
              min={1}
              max={15}
              value={count}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (!Number.isNaN(value)) {
                  handleCountChange(value)
                }
              }}
            />
          </label>
        </div>
        <div>
          {members.map((member, index) => (
            <div key={member.id}>
              <label>
                Integrante {index + 1}
                <input
                  value={member.name}
                  onChange={(event) =>
                    handleMemberNameChange(index, event.target.value)
                  }
                />
              </label>
            </div>
          ))}
        </div>
        <button type="submit">Guardar grupo</button>
        <button type="button" onClick={() => navigate('/')}>
          Cancelar
        </button>
      </form>
    </div>
  )
}
