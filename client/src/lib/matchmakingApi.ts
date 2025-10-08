import { getHttpEndpoint } from './serverConfig'

const JSON_HEADERS = {
  'Content-Type': 'application/json',
}

type ReservationResponse = {
  sessionId: string
  reservationId?: string
  protocol?: string
  reconnectionToken?: string
  devMode?: boolean
  roomId: string
  processId: string
  roomName: string
  metadata: Record<string, unknown>
  room: {
    roomId: string
    name: string
    processId: string
    publicAddress?: string
    clients: number
    maxClients: number
    locked: boolean
    private: boolean
    unlisted: boolean
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

const extractErrorMessage = async (response: Response, fallback: string) => {
  try {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const payload = await response.clone().json()
      if (typeof payload === 'string' && payload.trim()) {
        return payload
      }
      if (payload && typeof payload === 'object') {
        if (typeof (payload as { error?: unknown }).error === 'string') {
          return (payload as { error: string }).error
        }
        if (typeof (payload as { message?: unknown }).message === 'string') {
          return (payload as { message: string }).message
        }
      }
    } else {
      const text = await response.clone().text()
      if (text.trim()) {
        return text
      }
    }
  } catch {
    // ignore parsing errors and fall back to generic message
  }

  return `${fallback} (status ${response.status})`
}

const ensureSuccess = async <T>(response: Response, fallbackMessage: string) => {
  if (!response.ok) {
    const message = await extractErrorMessage(response, fallbackMessage)
    throw new Error(message)
  }

  return (await response.json()) as T
}

export const quickMatch = async (payload: QuickMatchPayload) => {
  const response = await fetch(`${getHttpEndpoint()}/matchmaking/quick`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })

  return ensureSuccess<ReservationResponse>(response, 'Unable to find an open lobby right now.')
}

export const createPrivateRoom = async (payload: PrivateRoomPayload) => {
  const response = await fetch(`${getHttpEndpoint()}/matchmaking/private`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })

  return ensureSuccess<{ joinCode: string; reservation: ReservationResponse }>(
    response,
    'Unable to create a private lobby right now.'
  )
}

export const joinPrivateRoom = async (payload: PrivateJoinPayload) => {
  const response = await fetch(`${getHttpEndpoint()}/matchmaking/private/join`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })

  return ensureSuccess<ReservationResponse>(response, 'Unable to join that lobby right now.')
}
