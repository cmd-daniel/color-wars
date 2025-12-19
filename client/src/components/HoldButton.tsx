import styles from "./HoldButton.module.css";

type HoldButtonProps = {
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onHoldCancel: () => void;
};

export const HoldButton = ({ onHoldStart, onHoldEnd, onHoldCancel }: HoldButtonProps) => {
  return (
    <button
      className={styles.holdBtn}
      onPointerDown={(e) => {
        e.preventDefault();
        onHoldStart();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        onHoldStart();
      }}
      onPointerLeave={(e) => {
        e.preventDefault();
        onHoldEnd();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        onHoldStart();
      }}
      onMouseLeave={(e) => {
        e.preventDefault();
        onHoldEnd();
      }}
      onMouseUp={(e) => {
        e.preventDefault();
        onHoldEnd();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onHoldEnd();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onHoldEnd();
      }}
      onPointerCancel={(e) => {
        e.preventDefault();
        onHoldCancel();
      }}
      onTouchCancel={(e) => {
        e.preventDefault();
        onHoldCancel();
      }}
    >
      <div className={styles.progressFill}></div>
      <span className={styles.btnText}>Hold to shake dice</span>
      <span className={styles.releaseText}>Release to throw</span>
    </button>
  );
};

type HoldButton2Props = {
  isActive: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onHoldCancel: () => void;
  hasRolled: boolean;
};

export const HoldButton2 = ({ onHoldStart, onHoldEnd, onHoldCancel, hasRolled }: HoldButton2Props) => {
  const listeners = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      onHoldStart();
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      onHoldEnd();
    },
    onPointerLeave: (e: React.PointerEvent) => {
      e.preventDefault();
      onHoldEnd();
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.preventDefault();
      onHoldCancel();
    },
  };
  return (
    <div
      {...listeners}
      className={`pointer-events-auto z-50 grow flex items-center justify-center transition-all rounded-md self-stretch duration-100 ${hasRolled ? 'hidden' : ''} `}
    >
      <div className="w-full h-full flex justify-center pt-2 select-none border-dashed rounded-md border-black border-2">
        hold to rotate dice
      </div>
    </div>
  );
};
