import { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  message: string
  timestamp: Date
}

const ChatSection = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      playerId: 'demo',
      playerName: 'Demo Player',
      message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
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
    <div className="chat-section">
      <div className="chat-messages">
        {messages.map(message => (
          <div key={message.id} style={{ marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
              {message.playerName}:
            </span>{' '}
            <span style={{ color: 'var(--foreground)' }}>
              {message.message}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          placeholder="send a message ..."
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button 
          className="chat-send-button"
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

export default ChatSection

