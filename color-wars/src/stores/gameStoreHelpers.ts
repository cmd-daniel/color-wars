import { useGameStore } from './gameStore'

// Helper function to initialize a demo game with our new game store
export const initializeDemoGame = () => {
  const store = useGameStore.getState()
  
  try {
    // Initialize game with 3 players
    store.initializeGame(2, ['Red Player', 'Blue Player'])
    
    // Start the game
    store.startGame()
    
    console.log('Demo game initialized with 3 players')
    console.log('Current player:', store.getCurrentPlayer()?.name)
    console.log('Game state:', store.state)
  } catch (error) {
    console.error('Failed to initialize demo game:', error)
  }
}

// Helper function to get current game status
export const getGameStatus = () => {
  const store = useGameStore.getState()
  return {
    isStarted: store.state.isGameStarted,
    isEnded: store.state.isGameEnded,
    currentPlayer: store.getCurrentPlayer(),
    players: store.state.players,
    winner: store.state.winnerId
  }
}

// Helper function to simulate a complete turn (for testing)
export const simulatePlayerTurn = () => {
  const store = useGameStore.getState()
  const currentPlayer = store.getCurrentPlayer()
  
  if (!currentPlayer) {
    console.log('No active player')
    return
  }
  
  console.log(`${currentPlayer.name}'s turn:`)
  
  // Roll dice
  const rollResult = store.rollDice()
  if (rollResult) {
    console.log(`- Rolled ${rollResult.value}, moved to position ${rollResult.newPosition + 1}`)
    if (rollResult.moneyGained > 0) {
      console.log(`- Gained $${rollResult.moneyGained}`)
    }
    if (rollResult.roundTripCompleted) {
      console.log(`- Completed a round trip!`)
    }
  }
  
  // End turn
  store.endTurn()
  
  const nextPlayer = store.getCurrentPlayer()
  console.log(`Next player: ${nextPlayer?.name}`)
}
