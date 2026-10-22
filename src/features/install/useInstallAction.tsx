import { useState } from 'react'
import { Button, Dialog } from '../../components/ui'
import { InstallSteps } from './InstallSteps'
import { promptInstall, useInstall } from './install'

// "Instalar": en Android (si Chrome lo permite) abre la instalación del sistema;
// si no, muestra un cartel con los pasos. Devuelve la acción y el cartel, que
// se pone en la pantalla.
export function useInstallAction() {
  const { canPrompt, platform } = useInstall()
  const [showSteps, setShowSteps] = useState(false)

  const install = () => {
    if (!canPrompt) {
      setShowSteps(true)
      return
    }
    void promptInstall().then((opened) => {
      if (!opened) {
        setShowSteps(true)
      }
    })
  }

  const dialog = showSteps ? (
    <Dialog
      title={
        platform === 'ios'
          ? 'Instalar en iPhone'
          : platform === 'android'
            ? 'Instalar en Android'
            : 'Instalar la app'
      }
      onClose={() => setShowSteps(false)}
      closeButton
    >
      <InstallSteps platform={platform} />
      <Button onClick={() => setShowSteps(false)}>Entendido</Button>
    </Dialog>
  ) : null

  return { install, dialog }
}
