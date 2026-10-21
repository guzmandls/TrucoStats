import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadMatches } from '../matches/matchesStorage'
import { forStats } from '../matches/guests'
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
  // Para los puntos y las estadísticas, los invitados con apodo de un
  // integrante cuentan como ese integrante y los demás no cuentan.
  const matches = useMemo(
    () =>
      allMatches && group ? forStats(group, activeMatches(allMatches)) : null,
    [allMatches, group],
  )

  return { group, matches, allMatches, setGroup, reload }
}
