import { ThemeProvider } from '@/components/theme-provider'
import DiceTrack from '@/components/DiceTrack'
import './App.css'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="app-shell">
        <DiceTrack />
      </div>
    </ThemeProvider>
  )
}

export default App
