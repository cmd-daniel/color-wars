import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useSessionStore } from '@/stores/sessionStore'
import DiceTrack from '@/components/DiceTrack'
import PlayerHud from '@/components/PlayerHud'
import TurnControls from '@/components/TurnControls'
import GameLog from '@/components/GameLog'
import GameStatus from '@/components/GameStatus'
import './RoomPage.css'

const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string>()

  const {
    status,
    roomView,
    isSpectator,
    joinRoomById,
    leaveRoom,
    room,
  } = useSessionStore()

  useEffect(() => {
    if (!roomId) {
      navigate('/')
      return
    }

    // If already connected to this room, do nothing
    if (room && room.roomId === roomId && status === 'connected') {
      setIsConnecting(false)
      setConnectionError(undefined)
      return
    }

    // If currently connecting, wait for it to complete
    if (status === 'connecting' || status === 'matchmaking') {
      setConnectionError(undefined)
      return
    }

    // Guest-only mode: Always join fresh on page load/refresh
    const joinCode = searchParams.get('code') || undefined

    const connectToRoom = async () => {
      setIsConnecting(true)
      setConnectionError(undefined)

      try {
        await joinRoomById(roomId, joinCode)
        setIsConnecting(false)
      } catch (error) {
        console.error('Failed to connect to room:', error)
        setConnectionError((error as Error).message || 'Unable to connect to room')
        setIsConnecting(false)

        // Redirect to lobby after error
        setTimeout(() => {
          navigate('/')
        }, 3000)
      }
    }

    void connectToRoom()
    // No cleanup function - user must explicitly leave via the button
  }, [roomId, searchParams, joinRoomById, navigate, room, status])

  const handleLeaveRoom = async () => {
    await leaveRoom()
    navigate('/')
  }

  // Show loading state
  if (isConnecting || status === 'connecting' || status === 'matchmaking') {
    return (
      <div className="room-page room-page--loading">
        <div className="room-loading">
          <div className="room-spinner"></div>
          <p>Connecting to room...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (connectionError) {
    return (
      <div className="room-page room-page--error">
        <div className="room-error">
          <h2>Connection Failed</h2>
          <p>{connectionError}</p>
          <p className="room-error__redirect">Redirecting to lobby...</p>
        </div>
      </div>
    )
  }

  // Show error if not connected
  if (status !== 'connected' || !roomView) {
    return (
      <div className="room-page room-page--error">
        <div className="room-error">
          <h2>Not Connected</h2>
          <p>Unable to establish connection to the game room.</p>
          <button onClick={() => navigate('/')}>Return to Lobby</button>
        </div>
      </div>
    )
  }

  const isGameActive = roomView.phase === 'active'
  const isGameFinished = roomView.phase === 'finished'

  // Show finished game state
  if (isGameFinished) {
    return (
      <div className="room-page room-page--finished">
        <div className="room-finished">
          <h2>Game Over</h2>
          <p>This match has ended.</p>
          <div className="room-finished__actions">
            <button onClick={handleLeaveRoom}>Return to Lobby</button>
          </div>
        </div>
      </div>
    )
  }

  // Show spectator banner if in spectator mode
  const spectatorBanner = isSpectator && (
    <div className="room-spectator-banner">
      <span>👁️ Spectator Mode - {isGameActive ? 'Watching the game' : 'Room is full or game already started'}</span>
    </div>
  )

  // Show game board + GameStatus component for both lobby and active phases
  return (
    <div className="room-page">
      {spectatorBanner}
      <div className="room-page-content">
        {/* Game Board - always visible */}
        <div className="game-board-container">
          <DiceTrack />
        </div>

        {/* GameStatus - always visible below */}
        <div className="game-status-container">
          <GameStatus onLeave={handleLeaveRoom} />
        </div>

        {/* Game HUD - only visible during active game */}
        {isGameActive && (
          <div className="game-hud-container">
            <TurnControls />
            <PlayerHud />
            <GameLog />
          </div>
        )}
      </div>
    </div>
  )
}

export default RoomPage

