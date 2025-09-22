import { useGameStore } from './gameStore'

// Helper function to initialize a demo game
export const initializeDemoGame = () => {
  const store = useGameStore.getState()
  
  // Add some demo players
  store.addPlayer({
    id: 'player1',
    name: 'Red Player',
    color: '#ff4444',
    score: 0
  })
  
  store.addPlayer({
    id: 'player2', 
    name: 'Blue Player',
    color: '#4444ff',
    score: 0
  })
  
  store.addPlayer({
    id: 'player3',
    name: 'Green Player', 
    color: '#44ff44',
    score: 0
  })
  
  // Set current player
  store.setCurrentPlayer('player1')
  
  // Mark as connected (for demo purposes)
  store.setConnectionStatus(true)
  
  console.log('Demo game initialized with 3 players')
}

// Helper functions are now moved to the main store
// These can be removed as they're replaced by store methods:
// - getNextPlayer() -> store.getNextPlayerId()
// - switchToNextPlayer() -> store.switchToNextPlayer()
