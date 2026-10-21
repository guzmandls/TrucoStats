import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadMatches } from '../matches/matchesStorage'
import { activeMatches } from '../matches/status'
import type { Match } from '../matches/types'
import { loadGroups } from './groupsStorage'
import type { Group } from './types'

export function useGroup(id: string | undefined) {
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [allMatches, setAllMatches] = useState<Match[] | null>(null)
  const [reloads, setReloads] = useState(0)
  const reload = useCallback(() => setReloads((value) => value + 1), [])

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
  }, [id, navigate, reloads])

  useEffect(() => {
    if (!group) {
      return
    }
    let active = true
    void loadMatches().then((all) => {
      if (!active) {
        return
      }
      setAllMatches(
        all
          .filter((match) => match.groupId === group.id)
          .sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
      )
    })
    return () => {
      active = false
    }
  }, [group, reloads])

  // `matches` son las que cuentan (sin canceladas); `allMatches`, todo el
  // historial.
  const matches = useMemo(
    () => (allMatches ? activeMatches(allMatches) : null),
    [allMatches],
  )

  return { group, matches, allMatches, setGroup, reload }
}
