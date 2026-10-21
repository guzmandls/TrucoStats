import { afterEach, describe, expect, it } from 'vitest'
import {
  clearSession,
  getSession,
  getToken,
  isRegistered,
  saveSession,
} from './session'

const registered = {
  token: 'a'.repeat(64),
  user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
}
const guest = {
  token: 'b'.repeat(64),
  user: { id: 'u2', username: null, email: null, name: 'Pedro' },
}

afterEach(() => {
  clearSession()
})

describe('session', () => {
  it('no hay sesión al empezar', () => {
    expect(getSession()).toBeNull()
    expect(getToken()).toBeNull()
  })

  it('guarda y recupera la sesión', () => {
    saveSession(registered)

    expect(getSession()).toEqual(registered)
    expect(getToken()).toBe(registered.token)
  })

  it('cerrar la sesión la borra', () => {
    saveSession(registered)
    clearSession()

    expect(getSession()).toBeNull()
  })

  it('ignora un valor guardado que no es una sesión válida', () => {
    localStorage.setItem('trucostats.session', 'esto no es json')
    expect(getSession()).toBeNull()

    localStorage.setItem('trucostats.session', JSON.stringify({ token: 5 }))
    expect(getSession()).toBeNull()
  })

  it('una cuenta registrada tiene usuario y la invitada no', () => {
    expect(isRegistered(null)).toBe(false)
    expect(isRegistered(guest)).toBe(false)
    expect(isRegistered(registered)).toBe(true)
  })
})
