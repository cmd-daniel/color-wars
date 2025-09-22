import { useGameStore } from '@/stores/gameStore'
import { useMemo } from 'react'

const PlayerList = () => {
  // Use individual selectors with proper equality functions
  const currentPlayerId = useGameStore(state => state.currentPlayerId)
  const players = useGameStore(state => state.players)
  const isConnected = useGameStore(state => state.isConnected)
  
  // Memoize computed values
  const currentPlayer = useMemo(() => {
    if (!currentPlayerId) return null
    return players[currentPlayerId] || null
  }, [currentPlayerId, players])
  
  const playerList = useMemo(() => {
    return Object.values(players)
  }, [players])

  // Generate avatar initials from player name
  const getPlayerInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="players-list">
      {playerList.map(player => (
        <div 
          key={player.id}
          className={`player-item ${currentPlayer?.id === player.id ? 'current-player' : ''}`}
        >
          <div className="player-info">
            <div 
              className="player-avatar"
              style={{ backgroundColor: player.color }}
            >
              {getPlayerInitials(player.name)}
            </div>
            <span className="player-name">{player.name}</span>
          </div>
          <span className="player-score">${player.score}</span>
        </div>
      ))}
      
      {/* Connection status indicator */}
      {!isConnected && (
        <div className="player-item" style={{ opacity: 0.7 }}>
          <div className="player-info">
            <div 
              className="player-avatar"
              style={{ backgroundColor: '#ef4444' }}
            >
              ⚠
            </div>
            <span className="player-name">Connection Lost</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerList

