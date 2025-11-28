import { useCallback } from 'react';
import styles from './HoldButton.module.css';

type HoldButtonProps = {
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onHoldCancel?: () => void;
};

export const HoldButton = ({ onHoldStart, onHoldEnd, onHoldCancel }: HoldButtonProps) => {
  const handleCancel = useCallback(() => {
    onHoldCancel?.();
    onHoldEnd(); // ensure cleanup even if pointercancel fires
  }, [onHoldCancel, onHoldEnd]);

  const supportsPointerEvents = typeof window !== 'undefined' && typeof window.PointerEvent !== 'undefined';
  return (
      <button 
        className={styles.holdBtn}
        onPointerDown={(e) => {e.preventDefault();onHoldStart();}}
        onTouchStart={(e) => {e.preventDefault();onHoldStart();}}
        onMouseDown={(e) => {if (!supportsPointerEvents){e.preventDefault();  onHoldStart();}}}
        onMouseUp={(e) => {if (!supportsPointerEvents){e.preventDefault(); onHoldEnd();}}}
        onPointerUp={(e) => {e.preventDefault();onHoldEnd();}}
        onTouchEnd={(e) => {e.preventDefault();onHoldEnd();}}
        onPointerCancel={(e) => {e.preventDefault(); handleCancel();}}
        onTouchCancel={(e) => {e.preventDefault(); handleCancel();}}
      >
        <div className={styles.progressFill}></div>
        <span className={styles.btnText}>Hold to shake dice</span>
        <span className={styles.releaseText}>Release to throw</span>
      </button>
  );
};
