import { useState, useEffect } from 'react'
import styles from './Dice.module.css'

interface DiceProps {
  value?: number
  onRoll?: () => void
  disabled?: boolean
  isRolling?: boolean
}

const Dice = ({ value = 1, onRoll, disabled = false, isRolling = false }: DiceProps) => {
  const [currentValue, setCurrentValue] = useState(value)
  const [displayValue, setDisplayValue] = useState(value)

  // Update display value when prop changes
  useEffect(() => {
    setCurrentValue(value)
    setDisplayValue(value)
  }, [value])

  // Handle rolling animation
  useEffect(() => {
    if (isRolling) {
      const rollDuration = 1000 // 1 second
      const intervalTime = 100
      const rolls = rollDuration / intervalTime

      let rollCount = 0
      const rollInterval = setInterval(() => {
        const randomValue = Math.floor(Math.random() * 6) + 1
        setDisplayValue(randomValue)
        rollCount++

        if (rollCount >= rolls) {
          clearInterval(rollInterval)
          setDisplayValue(currentValue)
        }
      }, intervalTime)

      return () => clearInterval(rollInterval)
    }
  }, [isRolling, currentValue])

  const handleClick = () => {
    if (disabled || isRolling) return
    onRoll?.()
  }

  return (
    <div className={styles.diceContainer}>
      <button
        className={`${styles.dice} ${isRolling ? styles.rolling : ''} ${disabled ? styles.disabled : ''}`}
        onClick={handleClick}
        disabled={disabled || isRolling}
        type="button"
      >
        <div className={styles.diceValue}>
          {displayValue}
        </div>
      </button>
      <div className={styles.rollText}>
        {isRolling ? 'Rolling...' : 'Tap to Roll'}
      </div>
    </div>
  )
}

export default Dice
