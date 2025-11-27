import { useMemo } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import type { GamePlayer } from '@/stores/sessionStore'
import { useMapInteractionsStore } from '@/stores/mapInteractionsStore'
import type { TerritoryInfo } from '@/types/game'
import type { TerritoryId } from '@/types/map'
import { useDiceRoll } from '@/hooks/useDiceRoll'
import Dice from './Dice'
import BetterDice from './BetterDicePanel'

// const currency = new Intl.NumberFormat('en-US', {
//   style: 'currency',
//   currency: 'USD',
//   maximumFractionDigits: 0,
// })

const EMPTY_PLAYERS: GamePlayer[] = []
// const EMPTY_TRACK_SPACES: TrackSpace[] = []
const EMPTY_TERRITORY_INFO = Object.freeze({}) as Record<TerritoryId, TerritoryInfo>
const EMPTY_TERRITORY_OWNERSHIP = Object.freeze({}) as Record<TerritoryId, string | null>

const TurnControls = () => {
  const roomView = useSessionStore((state) => state.roomView)
  const sessionId = useSessionStore((state) => state.sessionId)
  const isSpectator = useSessionStore((state) => state.isSpectator)
  const rollDice = useSessionStore((state) => state.rollDice)
  const endTurn = useSessionStore((state) => state.endTurn)
  const purchaseTerritory = useSessionStore((state) => state.purchaseTerritory)
  const gameNotice = useSessionStore((state) => state.gameNotice)
  const clearGameNotice = useSessionStore((state) => state.clearGameNotice)
  const {
    selectedTerritory: selectedTerritoryId,
    highlightedTerritory,
    setHighlightedTerritory,
  } = useMapInteractionsStore()

  const players = roomView?.players ?? EMPTY_PLAYERS
  // const _trackSpaces = roomView?.trackSpaces ?? EMPTY_TRACK_SPACES
  const territoryInfo = roomView?.territoryInfo ?? EMPTY_TERRITORY_INFO
  const ownershipByTerritory = roomView?.territoryOwnership ?? EMPTY_TERRITORY_OWNERSHIP

  const currentPlayer = players.find((player) => player.sessionId === roomView?.currentTurn) ?? null
  // const lastEvent = roomView?.lastEvent ?? null
  const turnPhase = roomView?.turnPhase ?? 'awaiting-roll'
  const lastRoll = roomView?.lastRoll

  // Use custom hook for dice roll state management
  const { isRolling, showRollResult: _showRollResult, rollResultText: _rollResultText, handleRoll: handleRollDice } = useDiceRoll(rollDice, {
    lastRoll,
  })

  const selectedOwnership = selectedTerritoryId ? ownershipByTerritory[selectedTerritoryId] ?? null : null
  const selectedTerritory = selectedTerritoryId ? territoryInfo[selectedTerritoryId] ?? null : null
  const selectedOwnerName = selectedOwnership
    ? players.find((player) => player.sessionId === selectedOwnership)?.name ?? selectedOwnership
    : null

  const selectedOffer = useMemo(() => {
    if (!selectedTerritoryId || selectedOwnership) {
      return null
    }
    return selectedTerritory ?? null
  }, [selectedOwnership, selectedTerritory, selectedTerritoryId])

  const canActThisTurn = !isSpectator && currentPlayer?.sessionId === sessionId
  const canRoll = canActThisTurn && turnPhase === 'awaiting-roll'
  const canEndTurn = canActThisTurn && turnPhase === 'awaiting-end-turn'
  const canPurchaseSelected = !isSpectator && Boolean(selectedOffer) && Boolean(currentPlayer) && currentPlayer!.money >= (selectedOffer?.cost ?? Infinity)
  const selectedOwnershipLabel = selectedOwnership
    ? selectedOwnership === sessionId
      ? 'Owned by you'
      : `Owned by ${selectedOwnerName ?? selectedOwnership}`
    : null

  const handlePurchase = () => {
    if (selectedOffer) {
      clearGameNotice()
      purchaseTerritory(selectedOffer.id)
    }
  }

  // const _eventAmountLabel =
  //   lastEvent && (lastEvent.kind === 'bonus' || lastEvent.kind === 'chest-bonus' || lastEvent.kind === 'roll-again')
  //     ? `+${currency.format(lastEvent.amount)}`
  //     : lastEvent
  //       ? `-${currency.format(lastEvent.amount)}`
  //       : ''

  return (
    <section className='turn-controls-container' >
      <div className="dice-container">
        {isRolling && !lastRoll && (
          <div className="dice-loading-spinner">
            <div className="spinner"></div>
          </div>
        )}
        <Dice 
          value={lastRoll?.[0] ?? null}
          diceType="default"
        />
        <Dice 
          value={lastRoll?.[1] ?? null}
          diceType="default"
        />
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
      {gameNotice && (
        <div className={`turn-feedback turn-feedback--${gameNotice.kind}`}>
          <span>{gameNotice.message}</span>
          <button type="button" onClick={clearGameNotice}>
            Dismiss
          </button>
        </div>
      )}
      <div className="turn-actions">
        <button type="button" onClick={handleRollDice} disabled={!canRoll || isRolling}>Roll dice</button>
        {!selectedOwnershipLabel && selectedOffer && (
          <button
            type="button"
            onClick={() => {
              handlePurchase()
              if (highlightedTerritory !== selectedOffer.id) setHighlightedTerritory(selectedOffer.id)
            }}
            disabled={!canPurchaseSelected || !canActThisTurn}>
            Purchase {selectedTerritory?.name} for ${selectedTerritory?.cost}
          </button>
        )}
        <button type="button" onClick={endTurn} disabled={!canEndTurn}>End turn</button>
      </div>
      <BetterDice/>
    </section>
  )
}

export default TurnControls
