const STORAGE_KEY = 'trucostats.membership'

function readIds(): string[] | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) {
    return null
  }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return null
    }
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return null
  }
}

function writeIds(ids: string[]): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export function loadMembership(): string[] {
  return readIds() ?? []
}

export function hasMembership(): boolean {
  return readIds() !== null
}

export function addMembership(groupId: string): void {
  const ids = loadMembership()
  if (!ids.includes(groupId)) {
    writeIds([...ids, groupId])
  }
}

export function removeMembership(groupId: string): void {
  writeIds(loadMembership().filter((id) => id !== groupId))
}

export function replaceMembership(ids: string[]): void {
  writeIds(ids)
}

export function clearMembership(): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.removeItem(STORAGE_KEY)
}
