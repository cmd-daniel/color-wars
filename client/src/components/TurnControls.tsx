import { useMemo } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import type { GamePlayer } from '@/stores/sessionStore'
import { useMapInteractionsStore } from '@/stores/mapInteractionsStore'
import type { TrackSpace, TerritoryInfo } from '@/types/game'
import type { TerritoryId } from '@/types/map'

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
  const currentSpace = currentPlayer ? trackSpaces[currentPlayer.position] ?? null : null
  const lastEvent = roomView?.lastEvent ?? null
  const turnPhase = roomView?.turnPhase ?? 'awaiting-roll'
  const lastRoll = roomView?.lastRoll ?? null

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
  const canPurchaseSelected =
    Boolean(selectedOffer) && Boolean(currentPlayer) && currentPlayer!.money >= (selectedOffer?.cost ?? Infinity)
  const selectedShortfall =
    !canPurchaseSelected && selectedOffer && currentPlayer ? selectedOffer.cost - currentPlayer.money : null
  const selectedTerritoryName = selectedTerritory?.name ?? selectedTerritoryId ?? ''
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

  const eventAmountLabel =
    lastEvent && (lastEvent.kind === 'bonus' || lastEvent.kind === 'chest-bonus' || lastEvent.kind === 'roll-again')
      ? `+${currency.format(lastEvent.amount)}`
      : lastEvent
        ? `-${currency.format(lastEvent.amount)}`
        : ''

  return (
    <section className="hud-panel">
      <header className="hud-panel__header">
        <div>
          <h2>Turn Controls</h2>
          <span className="hud-panel__sub">
            {currentPlayer
              ? currentPlayer.sessionId === sessionId
                ? 'Your turn'
                : `${currentPlayer.name}'s turn`
              : roomView?.phase === 'active'
                ? 'Awaiting players'
                : 'In lobby'}
          </span>
        </div>
        <div className="turn-indicator turn-indicator--phase">
          <span className="label">Phase</span>
          <span className="value">{turnPhase.replace(/-/g, ' ')}</span>
        </div>
      </header>
      <div className="turn-status">
        <div>
          <span className="label">Last roll</span>
          <strong className="value">{lastRoll ?? '—'}</strong>
        </div>
        <div>
          <span className="label">Space</span>
          <strong className="value">{currentSpace ? currentSpace.label : '—'}</strong>
        </div>
      </div>
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
        <button type="button" onClick={rollDice} disabled={!canRoll}>
          Roll dice
        </button>
        {selectedTerritoryId && (
          <div className="purchase-callout purchase-callout--selection">
            <div>
              <strong>{selectedTerritoryName || 'Selected territory'}</strong>
              {selectedOwnershipLabel ? (
                <p>{selectedOwnershipLabel}</p>
              ) : selectedTerritory ? (
                <p>Cost {currency.format(selectedTerritory.cost)}</p>
              ) : (
                <p>Unknown territory</p>
              )}
              {selectedShortfall !== null && (
                <p className="purchase-note">Needs {currency.format(selectedShortfall)}</p>
              )}
            </div>
            {!selectedOwnershipLabel && selectedOffer && (
              <div className="purchase-actions">
                <button
                  type="button"
                  onClick={() => {
                    handlePurchase()
                    if (highlightedTerritory !== selectedOffer.id) {
                      setHighlightedTerritory(selectedOffer.id)
                    }
                  }}
                  disabled={!canPurchaseSelected || !canActThisTurn}
                >
                  Purchase
                </button>
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={endTurn} disabled={!canEndTurn}>
          End turn
        </button>
      </div>
    </section>
  )
}

export default TurnControls
