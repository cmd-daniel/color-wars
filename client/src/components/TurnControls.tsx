import { useMemo, useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import type { GamePlayer } from '@/stores/sessionStore'
import { useMapInteractionsStore } from '@/stores/mapInteractionsStore'
import type { TrackSpace, TerritoryInfo } from '@/types/game'
import type { TerritoryId } from '@/types/map'
import Dice from './Dice'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const EMPTY_PLAYERS: GamePlayer[] = []
const EMPTY_TRACK_SPACES: TrackSpace[] = []
const EMPTY_TERRITORY_INFO = Object.freeze({}) as Record<TerritoryId, TerritoryInfo>
const EMPTY_TERRITORY_OWNERSHIP = Object.freeze({}) as Record<TerritoryId, string | null>

const TurnControls = () => {
  const [isDiceRolling, setIsDiceRolling] = useState(false)
  const [showDice, setShowDice] = useState(false)
  
  const roomView = useSessionStore((state) => state.roomView)
  const sessionId = useSessionStore((state) => state.sessionId)
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
  const trackSpaces = roomView?.trackSpaces ?? EMPTY_TRACK_SPACES
  const territoryInfo = roomView?.territoryInfo ?? EMPTY_TERRITORY_INFO
  const ownershipByTerritory = roomView?.territoryOwnership ?? EMPTY_TERRITORY_OWNERSHIP

  const currentPlayer = players.find((player) => player.sessionId === roomView?.currentTurn) ?? null
  const lastEvent = roomView?.lastEvent ?? null
  const turnPhase = roomView?.turnPhase ?? 'awaiting-roll'

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

  const canActThisTurn = currentPlayer?.sessionId === sessionId
  const canRoll = canActThisTurn && turnPhase === 'awaiting-roll'
  const canEndTurn = canActThisTurn && turnPhase === 'awaiting-end-turn'
  const canPurchaseSelected = Boolean(selectedOffer) && Boolean(currentPlayer) && currentPlayer!.money >= (selectedOffer?.cost ?? Infinity)
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

  const handleRollDice = () => {
    setShowDice(true)
    setIsDiceRolling(true)
  }

  const handleDiceRollComplete = (value: number) => {
    // Call the actual roll dice action
    rollDice()
    setIsDiceRolling(false)
    // Hide dice after a short delay to show the result
    setTimeout(() => {
      setShowDice(false)
    }, 1500)
  }

  const eventAmountLabel =
    lastEvent && (lastEvent.kind === 'bonus' || lastEvent.kind === 'chest-bonus' || lastEvent.kind === 'roll-again')
      ? `+${currency.format(lastEvent.amount)}`
      : lastEvent
        ? `-${currency.format(lastEvent.amount)}`
        : ''

  return (
    <section className='turn-controls-container' >
      {showDice && (
        <div style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          <Dice 
            autoRoll={isDiceRolling}
            onRollComplete={handleDiceRollComplete}
            diceType="default"
          />
        </div>
      )}
      {lastEvent && (
        <div className={`event-banner event-banner--${lastEvent.kind}`}>
          <div>
            <strong>{lastEvent.kind === 'bonus' || lastEvent.kind === 'chest-bonus' ? 'Reward' : 'Penalty'}</strong>
            <p>{lastEvent.description}</p>
          </div>
          {lastEvent.kind !== 'roll-again' && (
            <span className="event-banner__amount">{eventAmountLabel}</span>
          )}
        </div>
      )}
      {gameNotice && (
        <div className={`turn-feedback turn-feedback--${gameNotice.kind}`}>
          <span>{gameNotice.message}</span>
          <button type="button" onClick={clearGameNotice}>
            Dismiss
          </button>
        </div>
      )}
      <div className="turn-actions">
        <button type="button" onClick={handleRollDice} disabled={!canRoll}>Roll dice</button>
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
    </section>
  )
}

export default TurnControls
