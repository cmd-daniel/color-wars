import { ThemeProvider } from '@/components/theme-provider'
import HexGrid from '@/components/HexGrid'
import PlayerList from '@/components/PlayerList'
import TradesSection from '@/components/TradesSection'
import ChatSection from '@/components/ChatSection'
import ChatColumn from '@/components/ChatColumn'
import MobileChatDrawer from '@/components/MobileChatDrawer'
import Dice from '@/components/Dice'
import DiceTrack from '@/components/DiceTrack'
import { useScreenSize } from '@/hooks/useScreenSize'
import { useState } from 'react'
import type { PlayerPosition } from '@/types/diceTrack'
import './App.css'

function App() {
  const screenSize = useScreenSize()
  
  // Mock player data for testing dice track
  const [mockPlayers] = useState<PlayerPosition[]>([
    { playerId: '1', playerName: 'Alice', position: 3, color: '#ef4444' },
    { playerId: '2', playerName: 'Bob', position: 7, color: '#3b82f6' },
    { playerId: '3', playerName: 'Charlie', position: 12, color: '#22c55e' },
    { playerId: '4', playerName: 'Diana', position: 3, color: '#a855f7' }
  ])

  const handleDiceRoll = (value: number) => {
    console.log(`Dice rolled: ${value}`)
    // TODO: Implement dice roll logic with game state
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
            <Dice onRoll={handleDiceRoll} />
          </div>
        </div>
        
        {/* Dedicated dice track area */}
        <div className="dice-track-area">
          <DiceTrack 
            playerPositions={mockPlayers}
            onTileClick={handleTileClick}
            totalTiles={20}
          />
        </div>
        
        {/* Single instance of game info */}
        <div className="game-info-area">
          <PlayerList />
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
