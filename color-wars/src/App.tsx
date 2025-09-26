import { ThemeProvider } from '@/components/theme-provider'
import HollowGrid from '@/components/HollowGrid'
import './App.css'

function App() {

  return (
    <ThemeProvider defaultTheme='dark' storageKey='vite-ui-theme'>
      <div className="app-container">
        {/* Single instance of hollow grid */}
        <div className="hex-grid-area">
          <HollowGrid />
        </div>

      </div>
    </ThemeProvider>
  )
}

export default App
