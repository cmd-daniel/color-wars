import { useState } from 'react'

const TradesSection = () => {
  const [isCreatingTrade, setIsCreatingTrade] = useState(false)

  const handleCreateTrade = () => {
    setIsCreatingTrade(true)
    // TODO: Implement trade creation logic
    console.log('Creating new trade...')
    
    // Reset state after a brief moment (simulating async operation)
    setTimeout(() => {
      setIsCreatingTrade(false)
    }, 1000)
  }

  return (
    <div className="trades-section">
      <div className="trades-header">
        <span className="trades-title">Trades</span>
        <div className="dice-icons">
          <div className="dice-icon"></div>
          <div className="dice-icon"></div>
        </div>
      </div>
      
      <button 
        className="create-button"
        onClick={handleCreateTrade}
        disabled={isCreatingTrade}
      >
        {isCreatingTrade ? 'Creating...' : 'Create'}
      </button>
    </div>
  )
}

export default TradesSection

