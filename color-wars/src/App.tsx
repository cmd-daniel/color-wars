import { ThemeProvider } from '@/components/theme-provider'
import HexGrid from '@/components/HexGrid'
import PlayerList from '@/components/PlayerList'
import TradesSection from '@/components/TradesSection'
import ChatSection from '@/components/ChatSection'
import ChatColumn from '@/components/ChatColumn'
import MobileChatDrawer from '@/components/MobileChatDrawer'
import { useScreenSize } from '@/hooks/useScreenSize'
import './App.css'

function App() {
  const screenSize = useScreenSize()
  
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
