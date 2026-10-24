import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ButtonLink, EmptyNote } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { fetchShared, type LiveMatch } from './liveApi'
import { LiveMatchView } from './LiveMatchView'
import styles from './LiveMatchScreen.module.css'

const POLL_MS = 3000

interface SharedView {
  live: LiveMatch | null
  receivedAt: number
  loaded: boolean
}

// Mirar una partida rápida que alguien compartió en vivo (con el QR o el
// enlace). No hace falta cuenta. Se actualiza sola cada pocos segundos, con la
// pantalla visible; sin conexión se mantiene lo último que se vio.
export function SharedLiveScreen() {
  const { shareId = '' } = useParams<{ shareId: string }>()
  const navigate = useNavigate()
  const [view, setView] = useState<SharedView>({
    live: null,
    receivedAt: 0,
    loaded: false,
  })

  useEffect(() => {
    let active = true
    const poll = () => {
      if (document.visibilityState === 'hidden') {
        return
      }
      fetchShared(shareId)
        .then((live) => {
          if (active) {
            setView({ live, receivedAt: Date.now(), loaded: true })
          }
        })
        .catch((error: unknown) => {
          // Si el servidor dice que no está, se muestra así; un corte de
          // conexión deja lo último que se vio.
          if (active && error instanceof ApiError && error.status === 404) {
            setView({ live: null, receivedAt: Date.now(), loaded: true })
          }
        })
    }
    poll()
    const interval = window.setInterval(poll, POLL_MS)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [shareId])

  return (
    <LiveMatchView
      live={view.live}
      loaded={view.loaded}
      receivedAt={view.receivedAt}
      onBack={() => navigate('/')}
      missing={
        <>
          <EmptyNote>
            La partida ya terminó o el enlace no está completo.
          </EmptyNote>
          <div className={styles.back}>
            <ButtonLink to="/">Ir al inicio</ButtonLink>
          </div>
        </>
      }
      finishedAction="Ir al inicio"
      canceledNote="Quien la contaba la canceló."
      canceledAction="Ir al inicio"
    />
  )
}
