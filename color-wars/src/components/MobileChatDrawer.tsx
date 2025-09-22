import { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  message: string
  timestamp: Date
}

const MobileChatDrawer = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      playerId: 'demo',
      playerName: 'Demo Player',
      message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
      timestamp: new Date()
    },
    {
      id: '2',
      playerId: 'demo2',
      playerName: 'Player 2',
      message: 'Welcome to Color Wars!',
      timestamp: new Date()
    }
  ])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        playerId: 'current-player',
        playerName: 'You',
        message: currentMessage.trim(),
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, newMessage])
      setCurrentMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const lastMessage = messages[messages.length - 1]

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div 
          className="mobile-chat-backdrop"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Chat drawer */}
      <div className={`mobile-chat-drawer ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {/* Collapsed view - show last message and input */}
        {!isExpanded && (
          <div className="mobile-chat-collapsed">
            <div 
              className="mobile-chat-last-message"
              onClick={() => setIsExpanded(true)}
            >
              <span className="mobile-chat-sender">{lastMessage.playerName}:</span>
              <span className="mobile-chat-text">{lastMessage.message}</span>
              <div className="mobile-chat-expand-indicator">↑</div>
            </div>
            <div className="mobile-chat-input-container">
              <input
                type="text"
                className="mobile-chat-input"
                placeholder="Send a message..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button 
                className="mobile-chat-send-button"
                onClick={handleSendMessage}
                disabled={!currentMessage.trim()}
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="m22 2-7 20-4-9-9-4Z"/>
                  <path d="M22 2 11 13"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Expanded view - show all messages and input */}
        {isExpanded && (
          <div className="mobile-chat-expanded">
            <div className="mobile-chat-header">
              <h3>Chat</h3>
              <button 
                className="mobile-chat-close"
                onClick={() => setIsExpanded(false)}
              >
                ×
              </button>
            </div>
            
            <div className="mobile-chat-messages">
              {messages.map(message => (
                <div key={message.id} className="mobile-chat-message">
                  <span className="mobile-chat-sender">{message.playerName}:</span>
                  <span className="mobile-chat-text">{message.message}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="mobile-chat-input-container">
              <input
                type="text"
                className="mobile-chat-input"
                placeholder="Send a message..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button 
                className="mobile-chat-send-button"
                onClick={handleSendMessage}
                disabled={!currentMessage.trim()}
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="m22 2-7 20-4-9-9-4Z"/>
                  <path d="M22 2 11 13"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default MobileChatDrawer
