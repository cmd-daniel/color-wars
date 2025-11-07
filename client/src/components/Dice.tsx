import { useState, useEffect, useRef } from 'react'
import styles from './Dice.module.css'

interface DiceProps {
  onRollComplete?: (value: number) => void
  autoRoll?: boolean
  diceType?: 'default' | 'red' | 'blue' | 'black' | 'pink'
  disabled?: boolean
}

// Each face of the dice corresponds to a specific rotation
const perFaceRotations = [
  [-0.1, 0.3, -1],      // Face 1
  [-0.1, 0.6, -0.4],    // Face 2
  [-0.85, -0.42, 0.73], // Face 3
  [-0.8, 0.3, -0.75],   // Face 4
  [0.3, 0.45, 0.9],     // Face 5
  [-0.16, 0.6, 0.18]    // Face 6
]

const Dice = ({ onRollComplete, autoRoll = false, diceType = 'default', disabled = false }: DiceProps) => {
  const [isRolling, setIsRolling] = useState(false)
  const [isThrowing, setIsThrowing] = useState(false)
  const [currentValue, setCurrentValue] = useState<number | null>(null)
  const diceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoRoll && !disabled) {
      handleRoll()
    }
  }, [autoRoll, disabled])

  const setFaceRotation = (faceNum: number) => {
    if (diceRef.current && faceNum >= 1 && faceNum <= 6) {
      const rotation = perFaceRotations[faceNum - 1]
      diceRef.current.style.transform = `rotate3d(${rotation[0]}, ${rotation[1]}, ${rotation[2]}, 180deg)`
    }
  }

  const handleRoll = () => {
    if (disabled || isThrowing) return

    const diceValue = Math.floor(Math.random() * 6) + 1
    
    // Reset animations
    setIsThrowing(false)
    setIsRolling(false)
    setCurrentValue(null)

    // Set the target face
    setFaceRotation(diceValue)

    // Trigger throw animation after a small delay
    setTimeout(() => {
      setIsThrowing(true)
    }, 50)

    // Show result and call callback after animation
    setTimeout(() => {
      setCurrentValue(diceValue)
      setIsThrowing(false)
      if (onRollComplete) {
        onRollComplete(diceValue)
      }
    }, 700)
  }

  const getDiceClassName = () => {
    const classes = [styles.dice]
    
    if (isRolling) classes.push(styles.rolling)
    if (isThrowing) classes.push(styles.throw)
    if (diceType !== 'default') classes.push(styles[diceType])
    
    return classes.join(' ')
  }

  return (
    <div className={styles.diceWrap}>
      <div 
        ref={diceRef}
        className={getDiceClassName()}
      >
        <div className={`${styles.diceFace} ${styles.front}`}></div>
        <div className={`${styles.diceFace} ${styles.up}`}></div>
        <div className={`${styles.diceFace} ${styles.left}`}></div>
        <div className={`${styles.diceFace} ${styles.right}`}></div>
        <div className={`${styles.diceFace} ${styles.bottom}`}></div>
        <div className={`${styles.diceFace} ${styles.back}`}></div>
      </div>
    </div>
  )
}

export default Dice

