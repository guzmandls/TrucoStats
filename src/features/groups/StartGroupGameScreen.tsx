import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  Avatar,
  Button,
  Dialog,
  HeaderIconButton,
  Notice,
  TextInput,
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
import { CloseIcon } from '../../components/Icons'
import { normalizeName } from '../matches/guests'
import { avatarColor, avatarColors } from './avatar'
import { newMemberId } from './groupAdmin'
import { loadGroups } from './groupsStorage'
import type { Group } from './types'
import styles from './StartGroupGameScreen.module.css'

type TeamSide = 'nos' | 'ellos'

// Una persona que juega pero no es del grupo: se anota solo con su nombre.
interface Guest {
  id: string
  name: string
}

const MAX_GUEST_NAME_LENGTH = 20

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
  const [guests, setGuests] = useState<Guest[]>([])
  const [addingGuest, setAddingGuest] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestError, setGuestError] = useState<string | null>(null)

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

  const guestIds = new Set(guests.map((guest) => guest.id))
  // Cada equipo necesita al menos un integrante del grupo; los invitados
  // completan el equipo pero no suman ni restan puntos.
  const hasMember = (ids: string[]) => ids.some((id) => !guestIds.has(id))
  const teamsAreValid =
    nos.length > 0 &&
    nos.length === ellos.length &&
    nos.length <= 3 &&
    hasMember(nos) &&
    hasMember(ellos)
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
      ids.flatMap((playerId) => {
        const member = members.find((m) => m.id === playerId)
        if (member) {
          return [{ id: member.id, name: member.name }]
        }
        const guest = guests.find((g) => g.id === playerId)
        return guest
          ? [{ id: guest.id, name: guest.name, guest: true as const }]
          : []
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
      ? 'Cada equipo puede tener hasta 3 jugadores.'
      : nos.length === 0 || ellos.length === 0
        ? 'Elige al menos un jugador en cada equipo.'
        : nos.length !== ellos.length
          ? 'Los dos equipos deben tener la misma cantidad de jugadores.'
          : 'Cada equipo necesita al menos un integrante del grupo.'

  const setTarget = (value: number) => {
    setTargetOverride(clampTarget(value))
  }

  const colors = avatarColors(members.map((member) => member.id))

  const closeGuestDialog = () => {
    setAddingGuest(false)
    setGuestName('')
    setGuestError(null)
  }

  const addGuest = () => {
    const name = guestName.trim()
    if (name === '') {
      setGuestError('Escribe el nombre del jugador.')
      return
    }
    const taken = [...members, ...guests].some(
      (person) => normalizeName(person.name) === normalizeName(name),
    )
    if (taken) {
      setGuestError('Ya hay un jugador con ese nombre.')
      return
    }
    setGuests((prev) => [...prev, { id: `invitado-${newMemberId()}`, name }])
    closeGuestDialog()
  }

  const removeGuest = (guestId: string) => {
    setGuests((prev) => prev.filter((guest) => guest.id !== guestId))
    setNos((prev) => prev.filter((id) => id !== guestId))
    setEllos((prev) => prev.filter((id) => id !== guestId))
  }

  // Un renglón de la lista: integrante del grupo o invitado, con sus botones N y E.
  const renderRow = (person: {
    id: string
    name: string
    avatar?: string
    color: string
    guest?: boolean
  }) => {
    const inNos = nos.includes(person.id)
    const inEllos = ellos.includes(person.id)
    return (
      <div key={person.id} data-testid="integrante">
        <div className={styles.memberRow}>
          <span className={styles.memberWho}>
            <Avatar
              name={person.name}
              color={person.color}
              src={person.avatar}
              size={36}
            />
            <span className={styles.memberText}>
              <span className={styles.memberName}>{person.name}</span>
              {person.guest && (
                <span className={styles.guestTag}>Invitado</span>
              )}
            </span>
          </span>
          <span className={styles.memberActions}>
            {person.guest && (
              <button
                type="button"
                className={styles.removeGuest}
                aria-label={`Quitar a ${person.name} de la lista`}
                onClick={() => removeGuest(person.id)}
              >
                <CloseIcon size={18} />
              </button>
            )}
            <button
              type="button"
              className={inNos ? styles.sideOn : styles.side}
              aria-label={inNos ? 'Quitar de Nosotros' : 'Agregar a Nosotros'}
              onClick={() => toggleMember(person.id, 'nos')}
            >
              N
            </button>
            <button
              type="button"
              className={inEllos ? styles.sideOn : styles.side}
              aria-label={inEllos ? 'Quitar de Ellos' : 'Agregar a Ellos'}
              onClick={() => toggleMember(person.id, 'ellos')}
            >
              E
            </button>
          </span>
        </div>
      </div>
    )
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
      <ScreenContent>
        {problem && <Notice>{problem}</Notice>}

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
            {members.map((member) =>
              renderRow({
                id: member.id,
                name: member.name,
                avatar: member.avatar,
                color: colors[member.id],
              }),
            )}
            {guests.map((guest) =>
              renderRow({
                id: guest.id,
                name: guest.name,
                color: avatarColor(guest.id),
                guest: true,
              }),
            )}
          </Rows>
          <div className={styles.addGuest}>
            <Button variant="secondary" onClick={() => setAddingGuest(true)}>
              Agregar jugador
            </Button>
          </div>
        </Section>
      </ScreenContent>
      <ScreenFooter>
        <Button variant="inverse" onClick={start} disabled={!teamsAreValid}>
          Comenzar
        </Button>
      </ScreenFooter>
      {addingGuest && (
        <Dialog title="Agregar jugador" onClose={closeGuestDialog} closeButton>
          <TextInput
            aria-label="Nombre del jugador"
            placeholder="Nombre"
            autoFocus
            value={guestName}
            maxLength={MAX_GUEST_NAME_LENGTH}
            onChange={(event) => setGuestName(event.target.value)}
          />
          {guestError && <Notice>{guestError}</Notice>}
          <Button onClick={addGuest}>Agregar</Button>
        </Dialog>
      )}
    </Screen>
  )
}
