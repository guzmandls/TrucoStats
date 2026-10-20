import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadMatches } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { loadGroups } from './groupsStorage'
import type { Group } from './types'

export function useGroup(id: string | undefined) {
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [matches, setMatches] = useState<Match[] | null>(null)

  useEffect(() => {
    let active = true
    void loadGroups().then((groups) => {
      if (!active) {
        return
      }
      const found = groups.find((item) => item.id === id) ?? null
      if (!found) {
        navigate('/')
        return
      }
      setGroup(found)
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
    void loadMatches().then((all) => {
      if (!active) {
        return
      }
      setMatches(
        all
          .filter((match) => match.groupId === group.id)
          .sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
      )
    })
    return () => {
      active = false
    }
  }, [group])

  return { group, matches, setGroup }
}
