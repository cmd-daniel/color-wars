import { getHttpEndpoint } from './serverConfig'

const JSON_HEADERS = {
  'Content-Type': 'application/json',
}

type ReservationResponse = {
  sessionId: string
  room: {
    roomId: string
    name: string
    processId: string
    metadata: Record<string, unknown>
  }
}

type QuickMatchPayload = {
  playerName?: string
  preferences?: {
    maxPlayers?: number
    minPlayers?: number
  }
}

type PrivateRoomPayload = {
  playerName?: string
  maxPlayers?: number
  minPlayers?: number
}

type PrivateJoinPayload = {
  joinCode: string
  playerName?: string
}

export const quickMatch = async (payload: QuickMatchPayload) => {
  const response = await fetch(`${getHttpEndpoint()}/matchmaking/quick`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })
  debugger
  if (!response.ok) {
    throw new Error(`Quick match failed with status ${response.status}`)
  }

  const data = (await response.json()) as ReservationResponse
  return data
}

export const createPrivateRoom = async (payload: PrivateRoomPayload) => {
  const response = await fetch(`${getHttpEndpoint()}/matchmaking/private`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Create private room failed with status ${response.status}`)
  }

  const data = (await response.json()) as { joinCode: string; reservation: ReservationResponse }
  return data
}

export const joinPrivateRoom = async (payload: PrivateJoinPayload) => {
  const response = await fetch(`${getHttpEndpoint()}/matchmaking/private/join`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Join private room failed with status ${response.status}`)
  }

  const data = (await response.json()) as ReservationResponse
  return data
}
