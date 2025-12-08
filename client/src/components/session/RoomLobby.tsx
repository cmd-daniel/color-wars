import { useMemo, useState, type FormEvent } from 'react'
import { useStore } from '@/stores/sessionStore'
import './RoomLobby.css'

interface RoomLobbyProps {
  onLeave: () => void
}

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

const RoomLobby = ({ onLeave }: RoomLobbyProps) => {
  const {
    roomView,
    hostedJoinCode,
    sessionId,
    toggleReady,
    sendChat,
    isSpectator,
  } = useStore()

  const [chatDraft, setChatDraft] = useState('')

  const handleSubmitChat = (event: FormEvent) => {
    event.preventDefault()
    if (!chatDraft.trim()) {
      return
    }
    sendChat(chatDraft)
    setChatDraft('')
  }

  if (!roomView) {
    return null
  }

  const phaseLabel = roomView.phase ? roomView.phase.toUpperCase() : 'IDLE'
  const lobbyCountdown = useMemo(() => formatCountdown(roomView.lobbyEndsAt), [roomView.lobbyEndsAt])
  const waitCountdown = useMemo(() => formatCountdown(roomView.waitTimeoutAt), [roomView.waitTimeoutAt])
  const readyDisabled = !roomView || roomView.phase === 'finished' || isSpectator
  const readyLabel = roomView.players.find((player) => player.sessionId === sessionId)?.ready ? 'Unready' : 'Ready'

  // Copy room URL to clipboard
  const handleCopyRoomUrl = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      // Could add a toast notification here
      console.log('Room URL copied to clipboard')
    }).catch(err => {
      console.error('Failed to copy URL:', err)
    })
  }

  return (
    <div className="room-lobby">
      <div className="room-lobby-card">
        <header className="room-lobby-card__header">
          <div>
            <strong>Game Lobby</strong>
            <span className="room-lobby-phase">{phaseLabel}</span>
          </div>
          {roomView.phase === 'lobby' && (
            <span className="room-lobby-countdown">Starting in {lobbyCountdown ?? '—'}</span>
          )}
          {roomView.phase === 'waiting' && (
            <span className="room-lobby-countdown">Auto start in {waitCountdown ?? '—'}</span>
          )}
        </header>

        <div className="room-lobby-card__content">
          {isSpectator && (
            <div className="room-lobby-spectator-notice">
              <p>👁️ You are spectating this lobby</p>
            </div>
          )}

          <section className="room-lobby-section">
            <header className="room-lobby-section-header">
              <h3>Players ({roomView.connectedPlayers}/{roomView.maxPlayers})</h3>
              <div className="room-lobby-section-meta">
                {hostedJoinCode && (
                  <span className="room-lobby-join-code">
                    Share code: <strong>{hostedJoinCode}</strong>
                  </span>
                )}
                {roomView.isPrivate && !hostedJoinCode && roomView.joinCode && (
                  <span className="room-lobby-join-code">
                    Join code: <strong>{roomView.joinCode}</strong>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCopyRoomUrl}
                  className="room-lobby-button room-lobby-button--small"
                  title="Copy room URL"
                >
                  Copy Link
                </button>
                {!isSpectator && (
                  <button
                    type="button"
                    onClick={toggleReady}
                    disabled={readyDisabled}
                    className="room-lobby-button room-lobby-button--ready"
                  >
                    {readyLabel}
                  </button>
                )}
              </div>
            </header>
            <ul className="room-lobby-player-list">
              {roomView.players.map((player) => (
                <li
                  key={player.sessionId}
                  data-ready={player.ready}
                  data-self={player.sessionId === sessionId}
                  data-connected={player.connected}
                >
                  <div className="room-lobby-player-info">
                    <span
                      className="room-lobby-player-color"
                      style={{ backgroundColor: player.color }}
                    ></span>
                    <span className="room-lobby-player-name">{player.name}</span>
                  </div>
                  <span className="room-lobby-player-status">
                    {!player.connected && 'Disconnected'}
                    {player.connected && (player.ready ? 'Ready' : 'Waiting')}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="room-lobby-chat">
            <header className="room-lobby-section-header">
              <h3>Chat</h3>
            </header>
            <div className="room-lobby-chat__log">
              {roomView.chat.length === 0 && (
                <p className="room-lobby-chat__empty">No messages yet</p>
              )}
              {roomView.chat.map((entry) => (
                <p key={`${entry.senderId}:${entry.timestamp}`}>
                  <strong>{entry.senderId === sessionId ? 'You' : entry.senderId}</strong>: {entry.message}
                </p>
              ))}
            </div>
            <form className="room-lobby-chat__form" onSubmit={handleSubmitChat}>
              <input
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
                placeholder="Say something…"
                disabled={isSpectator}
              />
              <button type="submit" disabled={isSpectator}>
                Send
              </button>
            </form>
          </section>

          <div className="room-lobby-footer">
            <button
              type="button"
              onClick={onLeave}
              className="room-lobby-button room-lobby-button--leave"
            >
              Leave Lobby
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomLobby

