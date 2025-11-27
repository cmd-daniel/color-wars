import styles from './HoldButton.module.css';

interface HoldButtonProps {
  onMouseDown?: () => void;
  onMouseUp?: () => void | Promise<void>;
}

export const HoldButton = ({ onMouseDown, onMouseUp }: HoldButtonProps) => {
  return (
    <div className={styles.container}>
      <button 
        className={styles.holdBtn}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        <div className={styles.progressFill}></div>
        <span className={styles.btnText}>Hold to shake dice</span>
        <span className={styles.releaseText}>Release to throw</span>
      </button>
    </div>
  );
};
