import React, { useRef } from "react";
import { Dice } from "../components/BetterDice";
import { useDicePhysics } from "../hooks/useDicePhysics";
import { HoldButton } from "./HoldButton";
// MOCK API returning TWO dice faces
function fakeApiRollForBothDice() {
  return new Promise<{ faceA: number; faceB: number }>((res) => {
    setTimeout(() => {
      res({
        faceA: Math.floor(Math.random() * 6) + 1,
        faceB: Math.floor(Math.random() * 6) + 1,
      });
    }, 1500);
  });
}

export const DiceRotationApp: React.FC = () => {

  const holdStartRef = useRef(0);
  const rollId = useRef("crypto.randomUUID()");
  
  const diceA = useDicePhysics();
  const diceB = useDicePhysics();


  // -----------------------------------------------------
  // HANDLE USER HOLD START
  // -----------------------------------------------------
  const handleHoldStart = () => {
    if (diceA.isApiPending.current || diceB.isApiPending.current) return;

    holdStartRef.current = Date.now();
    rollId.current = crypto.randomUUID();

    diceA.setMode("accelerate");
    diceB.setMode("accelerate");
    
    diceA.startPhysicsLoop(rollId.current);
    diceB.startPhysicsLoop(rollId.current);
  };

  // -----------------------------------------------------
  // HANDLE USER RELEASE
  // -----------------------------------------------------
  const handleHoldRelease = async () => {
    const elapsed = Date.now() - holdStartRef.current;

    // EARLY RELEASE: <2s → normal decel
    if (elapsed < 1000) {
      diceA.setMode("ragdoll");
      diceB.setMode("ragdoll");
      return;
    }

    // LATE RELEASE: ≥2s → enter WAITING FOR API
    diceA.setMode("auto-spin");
    diceB.setMode("auto-spin");

    // ONE API REQUEST
    const result = await fakeApiRollForBothDice();

    diceA.setMode("spin-to-target", { face: result.faceA });
    diceB.setMode("spin-to-target", { face: result.faceB });
  };

  return (
    <div className="flex flex-col   text-white p-6 gap-6">
      <div className="flex-1 flex justify-center items-center gap-16" style={{ perspective: "1000px" }}>
        <Dice quaternion={diceA.quat} />
        <Dice quaternion={diceB.quat} />
      </div>

      <div className=" p-6 rounded-xl border border-gray-700 max-w-3xl mx-auto w-full">
        <h2 className="text-xl font-bold mb-4">You rolled : {diceA.rolledNumber} + {diceB.rolledNumber}</h2>

        {/* Face buttons */}
        {/* <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6].map((face) => (
            <button
              key={face}
              disabled={
                diceA.isApiPending.current || diceB.isApiPending.current
              }
              onClick={() => {
                diceA.rotateToFace(face);
                diceB.rotateToFace(face);
              }}
              className="px-4 py-3 bg-blue-600 rounded-lg font-bold hover:bg-blue-700"
            >
              Face {face}
            </button>
          ))}
        </div> */}

        {/* Random */}
        {/* <button
          disabled={
            diceA.isApiPending.current || diceB.isApiPending.current
          }
          onClick={() => {
            diceA.randomRotate();
            diceB.randomRotate();
          }}
          className="w-full py-3 mb-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold"
        >
          🎲 Random Rotation
        </button> */}

        <HoldButton
          onHoldStart={handleHoldStart}
          onHoldEnd={handleHoldRelease}
          />
      </div>
    </div>
  );
};

export default DiceRotationApp;
