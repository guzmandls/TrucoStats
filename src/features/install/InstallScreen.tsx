import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  Button,
  ButtonLink,
  EmptyNote,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
  ScreenFooter,
  Section,
} from '../../components/ui'
import { InstallSteps } from './InstallSteps'
import { promptInstall, useInstall } from './install'
import styles from './Install.module.css'

// Página /instalar: el enlace que se comparte para que otras personas instalen
// la app. Muestra lo que corresponde a su teléfono.
export function InstallScreen() {
  const navigate = useNavigate()
  const { installed, canPrompt, platform } = useInstall()
  // Si la ventana de instalación no se pudo abrir, se muestran los pasos.
  const [failed, setFailed] = useState(false)

  return (
    <Screen>
      <PageHeader
        title="Instalar trucoStats"
        leading={
          <HeaderIconButton label="Volver" onClick={() => navigate('/')}>
            <BackIcon />
          </HeaderIconButton>
        }
      />
      <ScreenContent>
        {installed ? (
          <EmptyNote>Ya tienes la app instalada</EmptyNote>
        ) : canPrompt && !failed ? (
          <Section title="Instalar">
            <div className={styles.cardBody}>
              <p className={styles.text}>
                Agrega trucoStats a tu pantalla de inicio y ábrela como una app,
                a pantalla completa.
              </p>
              <Button
                onClick={() =>
                  void promptInstall().then((opened) => setFailed(!opened))
                }
              >
                Instalar
              </Button>
            </div>
          </Section>
        ) : platform === 'other' ? (
          <Section title="Instalar">
            <div className={styles.cardBody}>
              <InstallSteps platform="other" />
            </div>
          </Section>
        ) : (
          <Section
            title={
              platform === 'ios' ? 'Instalar en iPhone' : 'Instalar en Android'
            }
          >
            <div className={styles.cardBody}>
              <InstallSteps platform={platform} />
            </div>
          </Section>
        )}
      </ScreenContent>
      <ScreenFooter>
        <ButtonLink to="/" variant="inverse">
          Ir al inicio
        </ButtonLink>
      </ScreenFooter>
    </Screen>
  )
}
