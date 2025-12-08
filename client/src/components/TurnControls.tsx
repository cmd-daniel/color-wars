import { useRef, useEffect } from 'react';
import { useStore } from '@/stores/sessionStore';
import { useDiceRoll } from '@/hooks/useDiceRoll';
import Dice from './BetterDice';
import { nanoid } from 'nanoid';
import { useDicePhysics } from '@/hooks/useDicePhysics';
import { HoldButton2 } from './HoldButton';

function fakeApiRollForBothDice() {
	return new Promise<{ faceA: number; faceB: number }>((res) => {
		setTimeout(() => {
			res({
				faceA: Math.floor(Math.random() * 6) + 1,
				faceB: Math.floor(Math.random() * 6) + 1,
			});
		}, 100);
	});
}

const TurnControls = () => {
	//const canEndTurn = useStore((state) => (state.player.id == state.state.activePlayerId) && state.state.turnPhase == 'awaiting-end-turn')

	const rollDice = useStore((state) => state.rollDice);
	const endTurn = useStore((state) => state.endTurn);
	const sendDiceMode = useStore((z) => z.sendDiceMode);
	const { showRollResult: _showRollResult, rollResultText: _rollResultText } = useDiceRoll(rollDice);
	// -----------------------------------------------------
	// DICE STATE
	// -----------------------------------------------------
	const diceA = useDicePhysics();
	const diceB = useDicePhysics();
	const holdStartRef = useRef<number | null>(null);
	const rollId = useRef('crypto.randomUUID()');

	const diceMode = useStore((z) => z.state.game.diceState.mode);
	const [a,b] = useStore((z) => z.state.game.diceState.rollTo);

	useEffect(() => {
		if (diceMode == 'ACCELERATING') {
			diceA.setMode('accelerate');
			diceB.setMode('accelerate');
			diceA.startPhysicsLoop(nanoid());
			diceB.startPhysicsLoop(nanoid());
		} else if (diceMode == 'RAGDOLLING') {
			diceA.setMode('ragdoll');
			diceB.setMode('ragdoll');
		} else if (diceMode == 'ROLLINGTOFACE'){
			diceA.setMode('spin-to-target', { face: a });
			diceB.setMode('spin-to-target', { face: b });
		}
	}, [diceMode]);

	// -----------------------------------------------------
	// HANDLE USER HOLD START
	// -----------------------------------------------------
	const handleHoldStart = () => {
		if (diceA.isApiPending.current /*|| diceB.isApiPending.current*/) return;

		holdStartRef.current = Date.now();
		rollId.current = nanoid();

		diceA.setMode('accelerate');
		diceB.setMode('accelerate');

		diceA.startPhysicsLoop(rollId.current);
		diceB.startPhysicsLoop(rollId.current);
	};

	// -----------------------------------------------------
	// HANDLE USER RELEASE
	// -----------------------------------------------------
	const handleHoldRelease = async () => {
		const elapsed = Date.now() - holdStartRef.current!;
		holdStartRef.current = null;
		// EARLY RELEASE: <2s → normal decel
		if (elapsed < 1000) {
			diceA.setMode('ragdoll');
			diceB.setMode('ragdoll');
			return;
		}

		// LATE RELEASE: ≥2s → enter WAITING FOR API
		diceA.setMode('auto-spin');
		diceB.setMode('auto-spin');
		// ONE API REQUEST
		const result = await fakeApiRollForBothDice();

		diceA.setMode('spin-to-target', { face: 5 });
		diceB.setMode('spin-to-target', { face: 5 });
	};

	const holdStart = () => {
		console.log('holding')
		holdStartRef.current = performance.now();
		sendDiceMode('acc');
	};
	const holdEnd = () => {
		if(holdStartRef.current == null) return
		const elapsed = performance.now() - holdStartRef.current!;
		holdStartRef.current = null;
		if (elapsed < 1000) sendDiceMode('rag');
		else sendDiceMode('roll')
	};

	return (
		<section className="flex flex-col relative">
			<div className="flex ">
				<Dice quaternion={diceA.quat} />
				<Dice quaternion={diceB.quat} />
			</div>
			<HoldButton2 isActive={true} onHoldStart={holdStart} onHoldEnd={holdEnd} onHoldCancel={holdEnd} />
		</section>
	);
};

export default TurnControls;
