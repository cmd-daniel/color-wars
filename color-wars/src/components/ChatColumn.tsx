import { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  message: string
  timestamp: Date
}

const ChatColumn = () => {
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
    },
    {
      id: '3',
      playerId: 'demo3',
      playerName: 'Player 3',
      message: 'This chat scrolls with the content on larger screens.',
      timestamp: new Date()
    }
  ])
  const [currentMessage, setCurrentMessage] = useState('')
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

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '1rem'
    }}>
      <h3 style={{ 
        margin: '0 0 1rem 0', 
        color: 'var(--foreground)',
        fontSize: '1.1rem',
        fontWeight: 600,
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0.5rem'
      }}>
        Chat
      </h3>
      
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        marginBottom: '1rem',
        padding: '0.5rem',
        background: 'var(--muted)',
        borderRadius: 'var(--radius)',
        fontSize: '0.875rem'
      }}>
        {messages.map(message => (
          <div key={message.id} style={{ marginBottom: '0.75rem' }}>
            <div style={{ 
              fontWeight: 600, 
              color: 'var(--primary)',
              marginBottom: '0.25rem'
            }}>
              {message.playerName}
            </div>
            <div style={{ 
              color: 'var(--foreground)',
              lineHeight: 1.4
            }}>
              {message.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem' 
      }}>
        <input
          type="text"
          style={{
            flex: 1,
            padding: '0.75rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--background)',
            color: 'var(--foreground)',
            fontSize: '1rem'
          }}
          placeholder="Type a message..."
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button 
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            border: 'none',
            borderRadius: 'var(--radius)',
            padding: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s'
          }}
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
  )
}

export default ChatColumn

