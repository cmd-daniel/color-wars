import { useEffect, useRef } from 'react'
import { useGameStore } from '@/stores/gameStore'
import styles from './GameLog.module.css'

interface LogEntry {
  id: string
  timestamp: Date
  type: 'dice_roll' | 'hex_purchase' | 'round_trip' | 'turn_start' | 'turn_end' | 'game_start' | 'victory'
  playerId?: string
  playerName?: string
  message: string
  details?: {
    diceValue?: number
    newPosition?: number
    moneyGained?: number
    hexCoordinates?: { q: number; r: number; s: number }
    hexCost?: number
    roundTripIncome?: number
  }
}

const GameLog = () => {
  const logEntries = useGameStore(state => state.state.gameLog)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logEntries])

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'dice_roll': return '🎲'
      case 'hex_purchase': return '🏰'
      case 'round_trip': return '🔄'
      case 'turn_start': return '▶️'
      case 'turn_end': return '⏸️'
      case 'game_start': return '🚀'
      case 'victory': return '🏆'
      default: return '📝'
    }
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'dice_roll': return 'var(--primary)'
      case 'hex_purchase': return 'var(--success)'
      case 'round_trip': return 'var(--warning)'
      case 'turn_start': return 'var(--info)'
      case 'turn_end': return 'var(--muted-foreground)'
      case 'game_start': return 'var(--success)'
      case 'victory': return 'var(--warning)'
      default: return 'var(--foreground)'
    }
  }

  if (logEntries.length === 0) {
    return (
      <div className={styles.gameLog}>
        <div className={styles.logHeader}>
          <h3>Game Log</h3>
          <span className={styles.logCount}>0 entries</span>
        </div>
        <div className={styles.logContainer} ref={logContainerRef}>
          <div className={styles.emptyLog}>
            <p>No actions yet. Start playing to see the log!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.gameLog}>
      <div className={styles.logHeader}>
        <h3>Game Log</h3>
        <span className={styles.logCount}>{logEntries.length} entries</span>
      </div>
      <div className={styles.logContainer} ref={logContainerRef}>
        {logEntries.map((entry) => (
          <div key={entry.id} className={styles.logEntry}>
            <div className={styles.logEntryHeader}>
              <span 
                className={styles.logIcon}
                style={{ color: getLogColor(entry.type) }}
              >
                {getLogIcon(entry.type)}
              </span>
              <span className={styles.logTimestamp}>
                {formatTimestamp(entry.timestamp)}
              </span>
            </div>
            <div className={styles.logMessage}>
              {entry.message}
            </div>
            {entry.details && (
              <div className={styles.logDetails}>
                {entry.details.diceValue && (
                  <span className={styles.detailItem}>
                    Rolled: {entry.details.diceValue}
                  </span>
                )}
                {entry.details.newPosition !== undefined && (
                  <span className={styles.detailItem}>
                    Position: {entry.details.newPosition + 1}
                  </span>
                )}
                {entry.details.moneyGained !== undefined && (
                  <span className={styles.detailItem}>
                    Money: {entry.details.moneyGained > 0 ? '+' : ''}${entry.details.moneyGained}
                  </span>
                )}
                {entry.details.hexCoordinates && (
                  <span className={styles.detailItem}>
                    Hex: ({entry.details.hexCoordinates.q},{entry.details.hexCoordinates.r},{entry.details.hexCoordinates.s})
                  </span>
                )}
                {entry.details.hexCost && (
                  <span className={styles.detailItem}>
                    Cost: ${entry.details.hexCost}
                  </span>
                )}
                {entry.details.roundTripIncome && (
                  <span className={styles.detailItem}>
                    Round Trip: +${entry.details.roundTripIncome}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default GameLog

