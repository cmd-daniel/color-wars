import { useRef, useEffect } from "react";
import { useStore } from "@/stores/sessionStore";
import Dice from "./BetterDice";
import { nanoid } from "nanoid";
import { useDicePhysics } from "@/hooks/useDicePhysics";
import { HoldButton2 } from "./HoldButton";
import { Button } from "./ui/button";

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
  const currentPlayerID = useStore((z) => z.currentPlayer.id);
  const activePlayerId = useStore((z) => z.state.game.activePlayerId);
  const isNOTActivePlayer = currentPlayerID !== activePlayerId;
  const endTurn = useStore((z) => z.endTurn);

  
  const hasRolledDice = useStore((z) => z.state.game.players[currentPlayerID]?.hasRolled ?? false);

  useEffect(() => {
    if (diceMode == "ROLLINGTOFACE") {
      if (diceA.animationRef.current == null) diceA.startPhysicsLoop(nanoid());
      if (diceB.animationRef.current == null) diceB.startPhysicsLoop(nanoid());
      diceA.setMode("spin-to-target", { face: a });
      diceB.setMode("spin-to-target", { face: b });
    } else if (diceMode == "ACCELERATING" && isNOTActivePlayer) {
      diceA.setMode("accelerate");
      diceB.setMode("accelerate");
      diceA.startPhysicsLoop(nanoid());
      diceB.startPhysicsLoop(nanoid());
    } else if (diceMode == "RAGDOLLING" && isNOTActivePlayer) {
      diceA.setMode("ragdoll");
      diceB.setMode("ragdoll");
    }
  }, [diceMode]);

  const holdStart = () => {
    if(isNOTActivePlayer) return;
    holdStartRef.current = performance.now();
    diceA.setMode("accelerate");
    diceB.setMode("accelerate");
    diceA.startPhysicsLoop(nanoid());
    diceB.startPhysicsLoop(nanoid());
    sendDiceMode("acc");
  };
  const holdEnd = () => {
    if(isNOTActivePlayer) return;
    if (holdStartRef.current == null) return;
    const elapsed = performance.now() - holdStartRef.current!;
    holdStartRef.current = null;
    if( elapsed > 10000 ) {
      return;
    }
    if (elapsed < 1000) {
      diceA.setMode("ragdoll");
      diceB.setMode("ragdoll");
      sendDiceMode("rag");
    } else {
      sendDiceMode("roll");
    }
  };

  return (
    <section className="relative flex h-full w-full items-center justify-between">
      <div className="flex relative w-full h-full flex-1 grow-2 justify-center">
        <Dice quaternion={diceA.quat} />
        <Dice quaternion={diceB.quat} />
      </div> 
      <div className={`flex w-full h-full flex-1 justify-center items center flex-col gap-2  ${isNOTActivePlayer ? 'hidden' : ''}`}>
        <HoldButton2 hasRolled={hasRolledDice} isActive={true} onHoldStart={holdStart} onHoldEnd={holdEnd} onHoldCancel={holdEnd} />
        <div className={`${hasRolledDice ? '' : 'hidden'}`}>
          <Button onClick={endTurn}>End Turn</Button>
        </div>
      </div>
    </section>
  );
};

export default TurnControls;
