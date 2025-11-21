import { useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import type { GamePlayer } from '@/stores/sessionStore'
import './GameStatus.css'

// Available player icons
const PLAYER_ICONS = ['🎯', '⚔️', '🛡️', '👑', '🏰', '🗡️', '🎪', '🎭', '🎨', '🎬', '🎪', '🎲']

interface GameStatusProps {
  onLeave: () => void
}

const GameStatus = ({ onLeave }: GameStatusProps) => {
  const {
    roomView,
    sessionId,
    isSpectator,
    setIcon,
    updateRoomSettings,
    kickPlayer,
    startGame,
  } = useSessionStore()

  const [_selectedIcon, setSelectedIcon] = useState<string>('')
  const [showIconSelector, setShowIconSelector] = useState(false)
  const [maxPlayersInput, setMaxPlayersInput] = useState('')
  const [startingCashInput, setStartingCashInput] = useState('')

  if (!roomView) {
    return null
  }

  const isLeader = roomView.leaderId === sessionId
  const isLobbyPhase = roomView.phase === 'lobby'
  const currentPlayer = roomView.players.find(p => p.sessionId === sessionId)
  const hasIcon = currentPlayer?.icon && currentPlayer.icon.length > 0

  // Get icons that are already taken
  const takenIcons = roomView.players.map(p => p.icon).filter(Boolean)
  const availableIcons = PLAYER_ICONS.filter(icon => !takenIcons.includes(icon))

  const handleIconSelect = (icon: string) => {
    setSelectedIcon(icon)
    setIcon(icon)
    setShowIconSelector(false)
  }

  const handleUpdateMaxPlayers = () => {
    const value = parseInt(maxPlayersInput)
    if (value >= 1 && value <= 12) {
      updateRoomSettings({ maxPlayers: value })
      setMaxPlayersInput('')
    }
  }

  const handleUpdateStartingCash = () => {
    const value = parseInt(startingCashInput)
    if (value >= 0) {
      updateRoomSettings({ startingCash: value })
      setStartingCashInput('')
    }
  }

  const handleStartGame = () => {
    // Check if all players have icons
    const playersWithoutIcon = roomView.players.filter(p => !p.icon)
    if (playersWithoutIcon.length > 0) {
      alert('All players must select an icon before starting')
      return
    }
    startGame()
  }

  return (
    <div className="game-status">
      <div className="game-status-header">
        <h3>
          {isLobbyPhase ? '🎮 Lobby' : '🎯 Game Active'}
        </h3>
        <span className="game-status-room-info">
          Room: {roomView.roomId}
        </span>
      </div>

      {/* Room Settings (Leader only, Lobby only) */}
      {isLeader && isLobbyPhase && (
        <div className="game-status-settings">
          <h4>⚙️ Room Settings</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Max Players: {roomView.maxPlayers}</label>
              <div className="setting-input">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={maxPlayersInput}
                  onChange={(e) => setMaxPlayersInput(e.target.value)}
                  placeholder={roomView.maxPlayers.toString()}
                />
                <button onClick={handleUpdateMaxPlayers}>Update</button>
              </div>
            </div>
            <div className="setting-item">
              <label>Starting Cash: ${roomView.startingCash}</label>
              <div className="setting-input">
                <input
                  type="number"
                  min="0"
                  value={startingCashInput}
                  onChange={(e) => setStartingCashInput(e.target.value)}
                  placeholder={roomView.startingCash.toString()}
                />
                <button onClick={handleUpdateStartingCash}>Update</button>
              </div>
            </div>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={roomView.isPublic}
                  onChange={(e) => updateRoomSettings({ isPublic: e.target.checked })}
                />
                {' '}Public Room (Allow quick match players)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Players List */}
      <div className="game-status-players">
        <div className="players-header">
          <h4>👥 Players ({roomView.connectedPlayers}/{roomView.maxPlayers})</h4>
        </div>
        <ul className="players-list">
          {roomView.players.map((player: GamePlayer) => {
            const isYou = player.sessionId === sessionId
            const isThisLeader = player.sessionId === roomView.leaderId
            
            return (
              <li
                key={player.sessionId}
                className={`player-item ${isYou ? 'player-item--you' : ''} ${!player.connected ? 'player-item--disconnected' : ''}`}
              >
                <div className="player-info">
                  <span className="player-icon">{player.icon || '❓'}</span>
                  <span
                    className="player-color"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="player-name">
                    {player.name}
                    {isThisLeader && ' 👑'}
                    {isYou && ' (You)'}
                    {!player.connected && ' [Disconnected]'}
                  </span>
                </div>
                <div className="player-actions">
                  {!isLobbyPhase && (
                    <span className="player-money">${player.money}</span>
                  )}
                  {isLeader && isLobbyPhase && !isYou && (
                    <button
                      className="kick-button"
                      onClick={() => kickPlayer(player.sessionId)}
                      title="Kick player"
                    >
                      ❌
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Icon Selector (Lobby only, for current player) */}
      {isLobbyPhase && !isSpectator && (
        <div className="game-status-icon-selector">
          {!hasIcon && (
            <button
              className="select-icon-button"
              onClick={() => setShowIconSelector(!showIconSelector)}
            >
              {showIconSelector ? 'Close' : 'Select Your Icon'}
            </button>
          )}
          {hasIcon && (
            <button
              className="change-icon-button"
              onClick={() => setShowIconSelector(!showIconSelector)}
            >
              Change Icon ({currentPlayer?.icon})
            </button>
          )}
          {showIconSelector && (
            <div className="icon-grid">
              {availableIcons.map((icon) => (
                <button
                  key={icon}
                  className="icon-option"
                  onClick={() => handleIconSelect(icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="game-status-actions">
        {isLeader && isLobbyPhase && (
          <button
            className="start-game-button"
            onClick={handleStartGame}
          >
            🚀 Start Game
          </button>
        )}
        {isLobbyPhase && (
          <button
            className="leave-button"
            onClick={onLeave}
          >
            Leave Room
          </button>
        )}
      </div>

      {isSpectator && (
        <div className="spectator-notice">
          👁️ You are spectating
        </div>
      )}
    </div>
  )
}

export default GameStatus


