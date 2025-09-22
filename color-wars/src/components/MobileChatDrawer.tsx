import { useState, useRef, useEffect } from 'react'
import styles from './MobileChatDrawer.module.css'

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
          className={styles.backdrop}
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Chat drawer */}
      <div className={`${styles.drawer} ${isExpanded ? styles.expanded : styles.collapsed}`}>
        {/* Collapsed view - show last message and input */}
        {!isExpanded && (
          <div className={styles.collapsed}>
            <div 
              className={styles.lastMessage}
              onClick={() => setIsExpanded(true)}
            >
              <span className={styles.sender}>{lastMessage.playerName}:</span>
              <span className={styles.text}>{lastMessage.message}</span>
              <div className={styles.expandIndicator}>↑</div>
            </div>
            <div className={styles.inputContainer}>
              <input
                type="text"
                className="{styles.input}"
                placeholder="Send a message..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button 
                className="{styles.sendButton}"
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
          <div className="{styles.expanded}">
            <div className="{styles.header}">
              <h3>Chat</h3>
              <button 
                className="{styles.close}"
                onClick={() => setIsExpanded(false)}
              >
                ×
              </button>
            </div>
            
            <div className="{styles.messages}">
              {messages.map(message => (
                <div key={message.id} className="{styles.message}">
                  <span className="{styles.sender}">{message.playerName}:</span>
                  <span className="{styles.text}">{message.message}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="{styles.input}-container">
              <input
                type="text"
                className="{styles.input}"
                placeholder="Send a message..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button 
                className="{styles.sendButton}"
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
