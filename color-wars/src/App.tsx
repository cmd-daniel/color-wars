import { ThemeProvider } from '@/components/theme-provider'
import HexGrid from '@/components/HexGrid'
import PlayerList from '@/components/PlayerList'
import TradesSection from '@/components/TradesSection'
import ChatSection from '@/components/ChatSection'
import ChatColumn from '@/components/ChatColumn'
import MobileChatDrawer from '@/components/MobileChatDrawer'
import Dice from '@/components/Dice'
import DiceTrack from '@/components/DiceTrack'
import GameLog from '@/components/GameLog'
import { useScreenSize } from '@/hooks/useScreenSize'
import { useMemo, useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import type { PlayerPosition } from '@/types/diceTrack'
import './App.css'

function App() {
  const screenSize = useScreenSize()
  
  // Get game store state and methods
  const players = useGameStore(state => state.state.players)
  const diceTrackTiles = useGameStore(state => state.state.diceTrackTiles)
  const dice = useGameStore(state => state.state.dice)
  const currentPlayer = useGameStore(state => state.getCurrentPlayer())
  const rollDice = useGameStore(state => state.rollDice)
  const endTurn = useGameStore(state => state.endTurn)
  const isGameStarted = useGameStore(state => state.state.isGameStarted)
  
  // Animation state for token movement
  const [isAnimating, setIsAnimating] = useState(false)
  
  // Convert game store players to PlayerPosition format for DiceTrack
  const playerPositions = useMemo((): PlayerPosition[] => {
    return players.map(player => ({
      playerId: player.id,
      playerName: player.name,
      position: player.diceTrackPosition,
      color: player.color
    }))
  }, [players])

  const handleDiceRoll = () => {
    console.log('Dice roll triggered')
    
    // Start animation
    setIsAnimating(true)
    
    const result = rollDice()
    if (result) {
      // Stop animation after 1.5 seconds (matching CSS animation duration)
      setTimeout(() => {
        setIsAnimating(false)
      }, 1500)
    } else {
      console.log('Cannot roll dice - not your turn or already rolled')
      setIsAnimating(false)
    }
  }

  const handleTileClick = (tile: any) => {
    console.log('Tile clicked:', tile)
    // TODO: Implement tile interaction logic
  }
  
  // Determine which chat component to render
  const renderChat = () => {
    if (screenSize === 'mobile') {
      // Mobile: compressed chat with expandable drawer
      return (
        <div className="chat-area">
          <MobileChatDrawer />
        </div>
      )
    } else if (screenSize === 'desktop-large') {
      // Desktop large: dedicated chat column
      return (
        <div className="chat-area">
          <ChatColumn />
        </div>
      )
    } else {
      // tablet: chat in left column
      return (
        <div className="chat-area">
          <ChatSection />
        </div>
      )
    }
  }

  return (
    <ThemeProvider defaultTheme='dark' storageKey='vite-ui-theme'>
      <div className="app-container">
        {/* Single instance of hex grid */}
        <div className="hex-grid-area">
          <HexGrid />
        </div>
        
        {/* Dedicated dice area */}
        <div className="dice-area">
          <div className="dice-container">
            <Dice 
              value={dice.currentValue}
              onRoll={handleDiceRoll} 
              disabled={!isGameStarted || !currentPlayer?.canRoll}
              isRolling={dice.isRolling}
            />
            {/* End Turn button - only show if game started and current player has rolled */}
            {isGameStarted && currentPlayer && !currentPlayer.canRoll && (
              <button 
                onClick={endTurn}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                End Turn
              </button>
            )}
          </div>
        </div>
        
        {/* Dedicated dice track area */}
        <div className="dice-track-area">
          <DiceTrack 
            tiles={diceTrackTiles}
            playerPositions={playerPositions}
            onTileClick={handleTileClick}
            currentPlayerId={currentPlayer?.id}
            isAnimating={isAnimating}
          />
        </div>
        
        {/* Single instance of game info */}
        <div className="game-info-area">
          <PlayerList />
          <GameLog />
          <TradesSection />
          {/* Chat shows here ONLY for desktop-medium (1100-1365px) */}
          {screenSize === 'desktop-medium' && <ChatSection />}
        </div>
        
        {/* Conditional chat rendering for mobile, tablet, and desktop-large */}
        {(screenSize === 'mobile' || screenSize === 'tablet' || screenSize === 'desktop-large') && renderChat()}
      </div>
    </ThemeProvider>
  )
}

export default App
