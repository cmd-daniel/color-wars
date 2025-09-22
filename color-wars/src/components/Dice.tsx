import { useState } from 'react'
import styles from './Dice.module.css'

interface DiceProps {
  value?: number
  onRoll?: (value: number) => void
  disabled?: boolean
}

const Dice = ({ value, onRoll, disabled = false }: DiceProps) => {
  const [currentValue, setCurrentValue] = useState(value || 1)
  const [isRolling, setIsRolling] = useState(false)

  const rollDice = () => {
    if (disabled || isRolling) return

    setIsRolling(true)
    
    // Simulate rolling animation with multiple value changes
    const rollDuration = 1000 // 1 second
    const intervalTime = 100
    const rolls = rollDuration / intervalTime

    let rollCount = 0
    const rollInterval = setInterval(() => {
      const randomValue = Math.floor(Math.random() * 6) + 1
      setCurrentValue(randomValue)
      rollCount++

      if (rollCount >= rolls) {
        clearInterval(rollInterval)
        const finalValue = Math.floor(Math.random() * 6) + 1
        setCurrentValue(finalValue)
        setIsRolling(false)
        onRoll?.(finalValue)
      }
    }, intervalTime)
  }

  return (
    <div className={styles.diceContainer}>
      <button
        className={`${styles.dice} ${isRolling ? styles.rolling : ''} ${disabled ? styles.disabled : ''}`}
        onClick={rollDice}
        disabled={disabled || isRolling}
        type="button"
      >
        <div className={styles.diceValue}>
          {currentValue}
        </div>
      </button>
      <div className={styles.rollText}>
        {isRolling ? 'Rolling...' : 'Tap to Roll'}
      </div>
    </div>
  )
}

export default Dice
