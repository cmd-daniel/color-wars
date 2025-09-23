import { useGameStore } from '@/stores/gameStore'
import { useMemo } from 'react'
import styles from './PlayerList.module.css'

const PlayerList = () => {
  // Use selectors from our new game store structure
  const players = useGameStore(state => state.state.players)
  const isGameStarted = useGameStore(state => state.state.isGameStarted)
  const currentPlayer = useGameStore(state => state.getCurrentPlayer())
  
  // Memoize computed values
  const playerList = useMemo(() => {
    return players || []
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

  if (!isGameStarted && playerList.length === 0) {
    return (
      <div className={styles.playersList}>
        <div className={styles.noPlayers}>
          <span>No game started</span>
        </div>
      </div>
    )
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
            <div className={styles.playerDetails}>
              <span className={styles.playerName}>{player.name}</span>
              <span className={styles.playerMoney}>${player.money}</span>
            </div>
          </div>
          <div className={styles.playerStatus}>
            {player.isActive && <span className={styles.activeBadge}>Active</span>}
            <span className={styles.playerPosition}>Track: {player.diceTrackPosition + 1}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PlayerList

