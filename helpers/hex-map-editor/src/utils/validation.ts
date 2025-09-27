import type { MapConfig, StateId, HexCell } from '../schema/mapConfig'

export type ValidationLevel = 'info' | 'warning' | 'error'

export interface ValidationIssue {
  level: ValidationLevel
  type: 'empty-state' | 'orphan-hex' | 'disconnected-state'
  message: string
  stateId?: StateId
  hexKeys?: string[]
}

const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

const keyFor = (hex: Pick<HexCell, 'q' | 'r'>) => `${hex.q},${hex.r}`

export const validateMap = (map: MapConfig): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const stateLookup = new Map<StateId, Set<string>>()
  const hexLookup = new Map<string, HexCell>()

  map.hexes.forEach((hex) => {
    const key = keyFor(hex)
    hexLookup.set(key, hex)
    if (hex.stateId) {
      const bucket = stateLookup.get(hex.stateId) ?? new Set<string>()
      bucket.add(key)
      stateLookup.set(hex.stateId, bucket)
    }
  })

  // Empty states or state references without hex coverage
  map.states.forEach((state) => {
    if (state.hexIds.length === 0) {
      issues.push({
        level: 'warning',
        type: 'empty-state',
        stateId: state.id,
        message: `Territory "${state.name}" has no hexes assigned.`,
      })
    }
  })

  // Hex references with missing states
  map.hexes.forEach((hex) => {
    if (hex.stateId && !stateLookup.has(hex.stateId)) {
      issues.push({
        level: 'error',
        type: 'orphan-hex',
        stateId: hex.stateId,
        hexKeys: [keyFor(hex)],
        message: `Hex ${keyFor(hex)} references missing territory "${hex.stateId}".`,
      })
    }
  })

  // Disconnected states
  stateLookup.forEach((hexKeys, stateId) => {
    if (hexKeys.size <= 1) {
      return
    }

    const remaining = new Set(hexKeys)
    const startKey = remaining.values().next().value as string
    const queue = [startKey]
    const visited = new Set<string>([startKey])

    while (queue.length) {
      const currentKey = queue.shift() as string
      const [qStr, rStr] = currentKey.split(',')
      const q = Number.parseInt(qStr, 10)
      const r = Number.parseInt(rStr, 10)
      AXIAL_DIRECTIONS.forEach(({ q: dq, r: dr }) => {
        const neighbourKey = `${q + dq},${r + dr}`
        if (!remaining.has(neighbourKey) || visited.has(neighbourKey)) {
          return
        }
        queue.push(neighbourKey)
        visited.add(neighbourKey)
      })
    }

    if (visited.size !== hexKeys.size) {
      const missing = Array.from(hexKeys.values()).filter((key) => !visited.has(key))
      issues.push({
        level: 'warning',
        type: 'disconnected-state',
        stateId,
        hexKeys: missing.slice(0, 12),
        message: `Territory "${stateId}" is not contiguous.`,
      })
    }
  })

  return issues
}
