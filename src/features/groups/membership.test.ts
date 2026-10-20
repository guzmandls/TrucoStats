import { beforeEach, describe, expect, it } from 'vitest'
import {
  addMembership,
  clearMembership,
  hasMembership,
  loadMembership,
  removeMembership,
  replaceMembership,
} from './membership'

describe('membership', () => {
  beforeEach(() => {
    clearMembership()
  })

  it('devuelve una lista vacía y sin registro cuando no hay pertenencia', () => {
    expect(loadMembership()).toEqual([])
    expect(hasMembership()).toBe(false)
  })

  it('agrega y recupera grupos a la pertenencia', () => {
    addMembership('g1')
    addMembership('g2')
    expect(loadMembership()).toEqual(['g1', 'g2'])
    expect(hasMembership()).toBe(true)
  })

  it('no duplica un grupo ya presente', () => {
    addMembership('g1')
    addMembership('g1')
    expect(loadMembership()).toEqual(['g1'])
  })

  it('quita un grupo de la pertenencia', () => {
    replaceMembership(['g1', 'g2'])
    removeMembership('g1')
    expect(loadMembership()).toEqual(['g2'])
  })

  it('reemplaza la pertenencia completa', () => {
    addMembership('g1')
    replaceMembership(['g3'])
    expect(loadMembership()).toEqual(['g3'])
  })
})
