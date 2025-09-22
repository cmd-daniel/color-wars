import { useGameStore } from '@/stores/gameStore'
import { useMemo } from 'react'
import styles from './PlayerList.module.css'

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
    <div className={styles.playersList}>
      {playerList.map(player => (
        <div 
          key={player.id}
          className={`${styles.playerItem} ${currentPlayer?.id === player.id ? styles.currentPlayer : ''}`}
        >
          <div className={styles.playerInfo}>
            <div 
              className={styles.playerAvatar}
              style={{ backgroundColor: player.color }}
            >
              {getPlayerInitials(player.name)}
            </div>
            <span className={styles.playerName}>{player.name}</span>
          </div>
          <span className={styles.playerScore}>${player.score}</span>
        </div>
      ))}
      
      {/* Connection status indicator */}
      {!isConnected && (
        <div className={styles.playerItem} style={{ opacity: 0.7 }}>
          <div className={styles.playerInfo}>
            <div 
              className={styles.playerAvatar}
              style={{ backgroundColor: '#ef4444' }}
            >
              ⚠
            </div>
            <span className={styles.playerName}>Connection Lost</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerList

