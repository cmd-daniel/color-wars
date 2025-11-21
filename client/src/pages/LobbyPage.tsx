import { type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/stores/sessionStore'
import './LobbyPage.css'

const LobbyPage = () => {
  const {
    status,
    error,
    playerName,
    requestedJoinCode,
    setPlayerName,
    setRequestedJoinCode,
    clearError,
    quickMatch,
    createPrivateRoom,
    joinPrivateRoom,
  } = useSessionStore()

  const navigate = useNavigate()

  const handleQuickMatch = async () => {
    console.log('[LobbyPage] handleQuickMatch called')
    try {
      const roomId = await quickMatch()
      console.log('[LobbyPage] quickMatch returned:', roomId)
      if (roomId) {
        console.log('[LobbyPage] Navigating to:', `/room/${roomId}`)
        navigate(`/room/${roomId}`)
      } else {
        console.log('[LobbyPage] No roomId returned from quickMatch')
      }
    } catch (error) {
      console.error('Error in quick match:', error)
    }
  }

  const handleCreatePrivate = async () => {
    const roomId = await createPrivateRoom()
    if (roomId) {
      navigate(`/room/${roomId}`)
    }
  }

  const handleJoinPrivate = async (event: FormEvent) => {
    event.preventDefault()
    const roomId = await joinPrivateRoom()
    if (roomId) {
      navigate(`/room/${roomId}`)
    }
  }

  const isMatchmaking = status === 'matchmaking' || status === 'connecting'

  return (
    <div className="lobby-page">
      <div className="lobby-card">
        <header className="lobby-card__header">
          <h1>Color Wars</h1>
          <p>Multiplayer Territory Conquest</p>
        </header>

        {error && (
          <div className="lobby-card__error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        {isMatchmaking ? (
          <div className="lobby-card__content">
            <div className="lobby-loading">
              <div className="lobby-spinner"></div>
              <p>Finding a room…</p>
            </div>
          </div>
        ) : (
          <div className="lobby-card__content">
            <label className="lobby-field">
              <span>Display name</span>
              <input
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Commander"
                autoFocus
              />
            </label>

            <div className="lobby-actions">
              <button
                type="button"
                onClick={() => void handleQuickMatch()}
                className="lobby-button lobby-button--primary"
              >
                Play Now
              </button>
              <button
                type="button"
                onClick={() => void handleCreatePrivate()}
                className="lobby-button lobby-button--secondary"
              >
                Create Private Lobby
              </button>
            </div>

            <div className="lobby-divider">
              <span>or</span>
            </div>

            <form className="lobby-join-form" onSubmit={handleJoinPrivate}>
              <label className="lobby-field">
                <span>Join with code</span>
                <input
                  value={requestedJoinCode}
                  placeholder="ABC123"
                  onChange={(event) => setRequestedJoinCode(event.target.value)}
                />
              </label>
              <button type="submit" className="lobby-button lobby-button--secondary">
                Join Lobby
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default LobbyPage

