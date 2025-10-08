import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useSessionStore } from '@/stores/sessionStore'

const formatCountdown = (target: number | undefined) => {
  if (!target) {
    return null
  }
  const remaining = Math.max(0, Math.round((target - Date.now()) / 1000))
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return null
  }
  return `${remaining}s`
}

const MatchmakingOverlay = () => {
  const {
    status,
    error,
    playerName,
    roomView,
    hostedJoinCode,
    requestedJoinCode,
    sessionId,
    setPlayerName,
    setRequestedJoinCode,
    clearError,
    quickMatch,
    createPrivateRoom,
    joinPrivateRoom,
    leaveRoom,
    toggleReady,
    sendChat,
  } = useSessionStore()

  const [chatDraft, setChatDraft] = useState('')

  const isActiveGame = roomView?.phase === 'active'

  const handleSubmitChat = (event: FormEvent) => {
    event.preventDefault()
    if (!chatDraft.trim()) {
      return
    }
    sendChat(chatDraft)
    setChatDraft('')
  }

  const phaseLabel = roomView?.phase ? roomView.phase.toUpperCase() : 'IDLE'
  const lobbyCountdown = useMemo(() => formatCountdown(roomView?.lobbyEndsAt), [roomView?.lobbyEndsAt])
  const waitCountdown = useMemo(() => formatCountdown(roomView?.waitTimeoutAt), [roomView?.waitTimeoutAt])
  const readyDisabled = status !== 'connected' || !roomView || roomView.phase === 'finished'
  const readyLabel = roomView?.players.find((player) => player.sessionId === sessionId)?.ready ? 'Unready' : 'Ready'

  if (status === 'connected' && isActiveGame) {
    return null
  }

  return (
    <div className="matchmaking-overlay">
      <div className="matchmaking-card">
        <header className="matchmaking-card__header">
          <div>
            <strong>Multiplayer Lobby</strong>
            <span>{phaseLabel}</span>
          </div>
          {roomView?.phase === 'lobby' && (
            <span className="matchmaking-card__countdown">Lobby starts in {lobbyCountdown ?? '—'}</span>
          )}
          {roomView?.phase === 'waiting' && (
            <span className="matchmaking-card__countdown">Auto start in {waitCountdown ?? '—'}</span>
          )}
        </header>

        {error && (
          <div className="matchmaking-card__error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        {status === 'idle' && (
            <div className="matchmaking-card__content">
              <label className="matchmaking-field">
                <span>Display name</span>
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="Commander"
                />
              </label>
              <div className="matchmaking-actions">
                <button type="button" onClick={() => void quickMatch()}>
                  Play Now
                </button>
                <button type="button" onClick={() => void createPrivateRoom()}>
                  Create Private Lobby
                </button>
              </div>
            <form
              className="matchmaking-join"
              onSubmit={(event) => {
                event.preventDefault()
                void joinPrivateRoom()
              }}
            >
              <label className="matchmaking-field">
                <span>Join code</span>
                <input
                  value={requestedJoinCode}
                  placeholder="ABC123"
                  onChange={(event) => setRequestedJoinCode(event.target.value)}
                />
              </label>
              <button type="submit">Join Lobby</button>
            </form>
          </div>
        )}

        {status === 'matchmaking' && (
          <div className="matchmaking-card__content">
            <p>Finding a room…</p>
            <button type="button" onClick={() => void leaveRoom()}>
              Cancel
            </button>
          </div>
        )}

        {roomView && status !== 'idle' && status !== 'matchmaking' && (
          <div className="matchmaking-card__content">
            <section>
              <header className="matchmaking-section-header">
                <h3>Players ({roomView.connectedPlayers}/{roomView.maxPlayers})</h3>
                <div className="matchmaking-section-meta">
                  {hostedJoinCode && <span>Share code: {hostedJoinCode}</span>}
                  {roomView.isPrivate && !hostedJoinCode && roomView.joinCode && <span>Join code: {roomView.joinCode}</span>}
                  <button type="button" onClick={toggleReady} disabled={readyDisabled} className="matchmaking-ready">
                    {readyLabel}
                  </button>
                </div>
              </header>
              <ul className="matchmaking-player-list">
                {roomView.players.map((player) => (
                  <li
                    key={player.sessionId}
                    data-ready={player.ready}
                    data-self={player.sessionId === sessionId}
                  >
                    <span>{player.name}</span>
                    <span>{player.ready ? 'Ready' : 'Waiting'}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="matchmaking-chat">
              <header className="matchmaking-section-header">
                <h3>Chat</h3>
              </header>
              <div className="matchmaking-chat__log">
                {roomView.chat.length === 0 && <p className="matchmaking-chat__empty">No messages yet</p>}
                {roomView.chat.map((entry) => (
                  <p key={`${entry.senderId}:${entry.timestamp}`}>
                    <strong>{entry.senderId === sessionId ? 'You' : entry.senderId}</strong>: {entry.message}
                  </p>
                ))}
              </div>
              <form className="matchmaking-chat__form" onSubmit={handleSubmitChat}>
                <input
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  placeholder="Say something…"
                  disabled={status !== 'connected'}
                />
                <button type="submit" disabled={status !== 'connected'}>
                  Send
                </button>
              </form>
            </section>

            <div className="matchmaking-footer">
              <button type="button" onClick={() => void leaveRoom()}>
                Leave Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MatchmakingOverlay
