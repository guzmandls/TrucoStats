import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { loadGroups } from './groupsStorage'
import type { Group } from './types'

export function HomeScreen() {
  const [groups, setGroups] = useState<Group[]>([])

  useEffect(() => {
    let active = true
    void loadGroups().then((data) => {
      if (active) {
        setGroups(data)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <h1>TrucoStats</h1>
      <div>
        <Link to="/partida">Partida rápida</Link>
      </div>
      <div>
        <Link to="/crear-grupo">Crear grupo</Link>
      </div>
      <h2>Grupos</h2>
      {groups.length === 0 ? (
        <p>Aún no hay grupos</p>
      ) : (
        <ul>
          {groups.map((group) => (
            <li key={group.id}>
              <Link to={`/grupo/${group.id}`}>{group.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
