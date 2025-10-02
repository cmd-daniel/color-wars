import { ThemeProvider } from '@/components/theme-provider'
import DiceTrack from '@/components/DiceTrack'
import PlayerHud from '@/components/PlayerHud'
import TurnControls from '@/components/TurnControls'
import GameLog from '@/components/GameLog'
import './App.css'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="app-shell">
        <div className="game-layout">
          <div className="game-board">
            <DiceTrack />
          </div>
          <div className="game-hud">
            <PlayerHud />
            <TurnControls />
            <GameLog />
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
