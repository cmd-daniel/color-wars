import { useRef, useEffect } from "react";
import { useStore } from "@/stores/sessionStore";
import Dice from "./BetterDice";
import { nanoid } from "nanoid";
import { useDicePhysics } from "@/hooks/useDicePhysics";
import { HoldButton2 } from "./HoldButton";

const TurnControls = () => {
  //const canEndTurn = useStore((state) => (state.player.id == state.state.activePlayerId) && state.state.turnPhase == 'awaiting-end-turn')

  const sendDiceMode = useStore((z) => z.sendDiceMode);
  // -----------------------------------------------------
  // DICE STATE
  // -----------------------------------------------------
  const diceA = useDicePhysics();
  const diceB = useDicePhysics();
  const holdStartRef = useRef<number | null>(null);

  const diceMode = useStore((z) => z.state.game.diceState.mode);
  const [a, b] = useStore((z) => z.state.game.diceState.rollTo);

  useEffect(() => {
    if (diceMode == "ROLLINGTOFACE") {
      diceA.setMode("spin-to-target", { face: a });
      diceB.setMode("spin-to-target", { face: b });
    }
  }, [diceMode]);

  const holdStart = () => {
    console.log("holding");
    holdStartRef.current = performance.now();
    diceA.setMode("accelerate");
    diceB.setMode("accelerate");
    diceA.startPhysicsLoop(nanoid());
    diceB.startPhysicsLoop(nanoid());
    sendDiceMode("acc");
  };
  const holdEnd = () => {
    if (holdStartRef.current == null) return;
    const elapsed = performance.now() - holdStartRef.current!;
    holdStartRef.current = null;
    if (elapsed < 1000) {
      diceA.setMode("ragdoll");
      diceB.setMode("ragdoll");
      sendDiceMode("rag");
    }else {
      sendDiceMode("roll");
    }
  };

  return (
    <section className="relative flex justify-between w-full h-full items-center">
      <div className="flex grow-2 justify-center">
        <Dice quaternion={diceA.quat} />
        <Dice quaternion={diceB.quat} />
      </div>
      <HoldButton2
        isActive={true}
        onHoldStart={holdStart}
        onHoldEnd={holdEnd}
        onHoldCancel={holdEnd}
      />
    </section>
  );
};

export default TurnControls;
