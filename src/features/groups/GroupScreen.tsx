import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { loadGroups } from './groupsStorage'
import type { Group } from './types'

export function GroupScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)

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

  if (!group) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      <h1>{group.name}</h1>
      <div>
        <Link to={`/partida-grupo/${group.id}`}>Iniciar partida</Link>
      </div>
      <div>
        <Link to="/">Volver al inicio</Link>
      </div>
      <h2>Integrantes</h2>
      <ul>
        {group.members.map((member) => (
          <li key={member.id}>{member.name}</li>
        ))}
      </ul>
      <div>
        <p>Historial y estadísticas (próximamente)</p>
      </div>
    </div>
  )
}
