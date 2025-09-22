import { useState } from 'react'
import styles from './TradesSection.module.css'

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
    <div className={styles.tradesSection}>
      <div className={styles.tradesHeader}>
        <span className={styles.tradesTitle}>Trades</span>
        <div className={styles.diceIcons}>
          <div className={styles.diceIcon}></div>
          <div className={styles.diceIcon}></div>
        </div>
      </div>
      
      <button 
        className={styles.createButton}
        onClick={handleCreateTrade}
        disabled={isCreatingTrade}
      >
        {isCreatingTrade ? 'Creating...' : 'Create'}
      </button>
    </div>
  )
}

export default TradesSection

