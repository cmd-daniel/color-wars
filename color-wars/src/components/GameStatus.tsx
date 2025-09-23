import { useGameStore } from '@/stores/gameStore'
import { useMemo } from 'react'

const GameStatus = () => {
  // Use individual selectors with proper equality functions
  const currentPlayer = useGameStore(state => state.getCurrentPlayer())
  const players = useGameStore(state => state.state.players)
  const hexes = useGameStore(state => state.state.hexCells)
  const isConnected = useGameStore(state => state.state.isGameStarted)
  
  // Memoize computed values
  const playerList = useMemo(() => {
    return Object.values(players)
  }, [players])
  
  const gameStats = useMemo(() => {
    const totalHexes = hexes.size
    const claimedHexes = Array.from(hexes.values()).filter(hex => hex.ownerId).length
    return { totalHexes, claimedHexes }
  }, [hexes])

  return (
    <div style={{ 
      padding: '1rem', 
      border: '2px solid #ccc', 
      borderRadius: '8px', 
      backgroundColor: '#f5f5f5',
      marginBottom: '1rem'
    }}>
      <h2 style={{ margin: '0 0 1rem 0', color: '#333' }}>Game Status</h2>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Connection:</strong> 
        <span style={{ 
          color: isConnected ? '#22c55e' : '#ef4444',
          marginLeft: '0.5rem'
        }}>
          {isConnected ? '✓ Connected' : '✗ Disconnected'}
        </span>
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Current Player:</strong> 
        {currentPlayer ? (
          <span style={{ 
            color: currentPlayer.color, 
            fontWeight: 'bold',
            marginLeft: '0.5rem'
          }}>
            {currentPlayer.name}
          </span>
        ) : (
          <span style={{ marginLeft: '0.5rem' }}>None</span>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <strong>Grid Progress:</strong> 
        <span style={{ marginLeft: '0.5rem' }}>
          {gameStats.claimedHexes} / {gameStats.totalHexes} hexes claimed
        </span>
      </div>

      <div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#333', fontSize: '1rem' }}>Players & Scores:</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {playerList.map(player => (
            <div 
              key={player.id}
              style={{ 
                padding: '0.25rem 0.5rem',
                border: `2px solid ${player.color}`,
                borderRadius: '4px',
                backgroundColor: currentPlayer?.id === player.id ? player.color + '20' : 'transparent',
                fontSize: '0.9rem'
              }}
            >
              <span style={{ color: player.color, fontWeight: 'bold' }}>
                {player.name}
              </span>
              <span style={{ marginLeft: '0.5rem', color: '#666' }}>
                Money: ${player.money}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GameStatus
