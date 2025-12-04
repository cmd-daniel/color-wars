import { useMemo, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useDiceRoll } from '@/hooks/useDiceRoll';
import Dice from './BetterDice';
import { nanoid } from 'nanoid';
import { useDicePhysics } from '@/hooks/useDicePhysics';
import { HoldButton } from './HoldButton';

// const currency = new Intl.NumberFormat('en-US', {
//   style: 'currency',
//   currency: 'USD',
//   maximumFractionDigits: 0,
// })

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

const TurnControls = () => {
	//const canEndTurn = useSessionStore((state) => (state.player.id == state.state.activePlayerId) && state.state.turnPhase == 'awaiting-end-turn')

	const rollDice = useSessionStore((state) => state.rollDice);
	const endTurn = useSessionStore((state) => state.endTurn);
	// const {
	//   selectedTerritory: selectedTerritoryId,
	//   highlightedTerritory,
	//   setHighlightedTerritory,
	// } = useMapInteractionsStore()
	// Use custom hook for dice roll state management
	const { showRollResult: _showRollResult, rollResultText: _rollResultText } = useDiceRoll(rollDice);
	// -----------------------------------------------------
	// DICE STATE
	// -----------------------------------------------------
	const diceA = useDicePhysics();
	const diceB = useDicePhysics();
	const holdStartRef = useRef(0);
	const rollId = useRef('crypto.randomUUID()');

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
		const elapsed = Date.now() - holdStartRef.current;

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

		diceA.setMode('spin-to-target', { face: result.faceA });
		diceB.setMode('spin-to-target', { face: result.faceB });
	};

	// // const _trackSpaces = roomView?.trackSpaces ?? EMPTY_TRACK_SPACES
	// const territoryInfo = state?.territoryInfo ?? EMPTY_TERRITORY_INFO
	// const ownershipByTerritory = state?.territoryOwnership ?? EMPTY_TERRITORY_OWNERSHIP

	// const lastEvent = roomView?.lastEvent ?? null

	// const selectedOwnership = selectedTerritoryId ? ownershipByTerritory[selectedTerritoryId] ?? null : null
	// const selectedTerritory = selectedTerritoryId ? territoryInfo[selectedTerritoryId] ?? null : null
	// const selectedOwnerName = selectedOwnership
	//   ? players.find((player) => player.sessionId === selectedOwnership)?.name ?? selectedOwnership
	//   : null

	// const selectedOffer = useMemo(() => {
	//   if (!selectedTerritoryId || selectedOwnership) {
	//     return null
	//   }
	//   return selectedTerritory ?? null
	// }, [selectedOwnership, selectedTerritory, selectedTerritoryId])

	// const _eventAmountLabel =
	//   lastEvent && (lastEvent.kind === 'bonus' || lastEvent.kind === 'chest-bonus' || lastEvent.kind === 'roll-again')
	//     ? `+${currency.format(lastEvent.amount)}`
	//     : lastEvent
	//       ? `-${currency.format(lastEvent.amount)}`
	//       : ''
	return (
		<section className="turn-controls-container">
			<div className="dice-container">
				<Dice quaternion={diceA.quat} />
				<Dice quaternion={diceB.quat} />
			</div>
			{/* {showRollResult && (
        <div className="roll-result-banner">
          <span>{rollResultText}</span>
        </div>
      )} */}
			{/* {lastEvent && (
        <div className={`event-banner event-banner--${lastEvent.kind}`}>
          <div>
            <strong>{lastEvent.kind === 'bonus' || lastEvent.kind === 'chest-bonus' ? 'Reward' : 'Penalty'}</strong>
            <p>{lastEvent.description}</p>
          </div>
          {lastEvent.kind !== 'roll-again' && (
            <span className="event-banner__amount">{eventAmountLabel}</span>
          )}
        </div>
      )} */}

			<div className="turn-actions">
				<HoldButton onHoldStart={handleHoldStart} onHoldEnd={handleHoldRelease} onHoldCancel={handleHoldRelease} />
			</div>
			{/* <button type="button" onClick={handleRollDice} disabled={!canRoll || isRolling}>Roll dice</button> */}
			{/* <button type="button" onClick={endTurn} disabled={!canEndTurn}>End turn</button> */}
		</section>
	);
};

export default TurnControls;
