import { useState, useEffect, useRef, useCallback } from "react";

interface UseDiceRollOptions {
  lastRoll?: [number, number];
  onRollStart?: () => void;
  onRollComplete?: (roll: [number, number]) => void;
}

interface UseDiceRollReturn {
  isRolling: boolean;
  showRollResult: boolean;
  rollResultText: string;
  handleRoll: () => void;
}

/**
 * Custom hook to manage dice roll state and animations
 * Handles loading state, roll result display, and timing
 */
export const useDiceRoll = (
  rollDice: () => void,
  options: UseDiceRollOptions = {},
): UseDiceRollReturn => {
  const { lastRoll, onRollStart, onRollComplete } = options;

  const [isRolling, setIsRolling] = useState(false);
  const [showRollResult, setShowRollResult] = useState(false);
  const [rollResultText, setRollResultText] = useState<string>("");
  const previousLastRollRef = useRef<[number, number] | undefined>(undefined);

  // Watch for lastRoll changes to clear loading state and show roll result
  useEffect(() => {
    if (lastRoll && isRolling) {
      const prev = previousLastRollRef.current;
      // Check if values actually changed
      const valuesChanged = !prev || prev[0] !== lastRoll[0] || prev[1] !== lastRoll[1];

      if (valuesChanged) {
        setIsRolling(false);
        previousLastRollRef.current = lastRoll;

        // Notify parent that roll completed
        if (onRollComplete) {
          onRollComplete(lastRoll);
        }

        // Show roll result after dice animation completes (700ms)
        setTimeout(() => {
          const die1 = lastRoll[0];
          const die2 = lastRoll[1];
          const text = die1 === die2 ? `Rolled ${die1}` : `Rolled ${die1} and ${die2}`;

          setRollResultText(text);
          setShowRollResult(true);

          // Hide roll result after 1.5 seconds
          setTimeout(() => {
            setShowRollResult(false);
          }, 1500);
        }, 700);
      }
    }
  }, [lastRoll, isRolling, onRollComplete]);

  // Handle roll button click
  const handleRoll = useCallback(() => {
    setIsRolling(true);
    previousLastRollRef.current = undefined; // Reset to detect new roll

    // Notify parent that roll started
    if (onRollStart) {
      onRollStart();
    }

    // Send roll request to server
    rollDice();
  }, [rollDice, onRollStart]);

  return {
    isRolling,
    showRollResult,
    rollResultText,
    handleRoll,
  };
};
