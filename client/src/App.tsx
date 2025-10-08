import { ThemeProvider } from '@/components/theme-provider'
import DiceTrack from '@/components/DiceTrack'
import PlayerHud from '@/components/PlayerHud'
import TurnControls from '@/components/TurnControls'
import GameLog from '@/components/GameLog'
import MatchmakingOverlay from '@/components/session/MatchmakingOverlay'
import { useSessionStore } from '@/stores/sessionStore'
import './App.css'

function App() {
  const isGameActive = useSessionStore((state) => state.roomView?.phase === 'active')

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <MatchmakingOverlay />
      <div className="app-shell">
        <div className={`game-layout${isGameActive ? '' : ' game-layout--inactive'}`}>
          <div className="game-board">
            <DiceTrack />
          </div>
          <div className="game-hud">
            <TurnControls />
            <PlayerHud />
            <GameLog />
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
