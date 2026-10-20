import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  Button,
  HeaderIconButton,
  PageHeader,
  Rows,
  Screen,
  ScreenContent,
  ScreenFooter,
  Section,
  Stepper,
} from '../../components/ui'
import { clearGame, gameSlot } from '../counter/gameStorage'
import type { GameContext } from '../counter/gameContext'
import { MIN_TARGET, MAX_TARGET, clampTarget } from '../counter/useCounter'
import type { Modality, Participant } from '../matches/types'
import { loadGroups } from './groupsStorage'
import type { Group } from './types'
import styles from './StartGroupGameScreen.module.css'

type TeamSide = 'nos' | 'ellos'

const TARGET_STEP = 5

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

  const teamsAreValid =
    nos.length > 0 && nos.length === ellos.length && nos.length <= 3
  const modality = teamsAreValid ? modalityOf(nos.length) : null
  const target =
    targetOverride ??
    (modality ? DEFAULT_TARGETS[modality] : DEFAULT_TARGETS['2v2'])

  if (!group) {
    return (
      <Screen>
        <PageHeader
          title="Iniciar partida"
          leading={
            <HeaderIconButton label="Volver" onClick={() => navigate('/')}>
              <BackIcon />
            </HeaderIconButton>
          }
        />
        <ScreenContent>{null}</ScreenContent>
      </Screen>
    )
  }

  const toggleMember = (memberId: string, side: TeamSide) => {
    const inSide =
      side === 'nos' ? nos.includes(memberId) : ellos.includes(memberId)
    if (inSide) {
      if (side === 'nos') {
        setNos((prev) => prev.filter((m) => m !== memberId))
      } else {
        setEllos((prev) => prev.filter((m) => m !== memberId))
      }
      return
    }
    if (side === 'nos') {
      setEllos((prev) => prev.filter((m) => m !== memberId))
      setNos((prev) => [...prev, memberId])
    } else {
      setNos((prev) => prev.filter((m) => m !== memberId))
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
        ? 'Elige al menos un integrante en cada equipo.'
        : 'Los dos equipos deben tener la misma cantidad de integrantes.'

  const setTarget = (value: number) => {
    setTargetOverride(clampTarget(value))
  }

  return (
    <Screen>
      <PageHeader
        title="Iniciar partida"
        leading={
          <HeaderIconButton
            label="Volver"
            onClick={() => navigate(`/grupo/${group.id}`)}
          >
            <BackIcon />
          </HeaderIconButton>
        }
      />
      <ScreenContent flush>
        <div className={styles.top}>
          {problem && (
            <p className={styles.alert} role="alert">
              {problem}
            </p>
          )}
        </div>

        <Section title="Objetivo">
          <div
            className={styles.targetBlock}
            role="group"
            aria-label="Objetivo"
          >
            <Stepper
              value={target}
              min={MIN_TARGET}
              max={MAX_TARGET}
              decreaseLabel="Bajar objetivo"
              increaseLabel="Subir objetivo"
              onDecrease={() => setTarget(target - TARGET_STEP)}
              onIncrease={() => setTarget(target + TARGET_STEP)}
            />
          </div>
        </Section>

        <Section title="Equipos">
          <Rows>
            {members.map((member) => {
              const inNos = nos.includes(member.id)
              const inEllos = ellos.includes(member.id)
              return (
                <div key={member.id} data-testid="integrante">
                  <div className={styles.memberRow}>
                    <span className={styles.memberName}>{member.name}</span>
                    <span className={styles.memberActions}>
                      <button
                        type="button"
                        className={inNos ? styles.sideOn : styles.side}
                        aria-label={
                          inNos ? 'Quitar de Nosotros' : 'Agregar a Nosotros'
                        }
                        onClick={() => toggleMember(member.id, 'nos')}
                      >
                        N
                      </button>
                      <button
                        type="button"
                        className={inEllos ? styles.sideOn : styles.side}
                        aria-label={
                          inEllos ? 'Quitar de Ellos' : 'Agregar a Ellos'
                        }
                        onClick={() => toggleMember(member.id, 'ellos')}
                      >
                        E
                      </button>
                    </span>
                  </div>
                </div>
              )
            })}
          </Rows>
        </Section>
      </ScreenContent>
      <ScreenFooter>
        <Button variant="inverse" onClick={start} disabled={!teamsAreValid}>
          Comenzar
        </Button>
      </ScreenFooter>
    </Screen>
  )
}
