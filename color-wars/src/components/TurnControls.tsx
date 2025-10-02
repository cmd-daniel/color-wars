import { useMemo } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useMapInteractionsStore } from '@/stores/mapInteractionsStore'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const TurnControls = () => {
  const players = useGameStore((state) => state.players)
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex)
  const turnPhase = useGameStore((state) => state.turnPhase)
  const lastRoll = useGameStore((state) => state.lastRoll)
  const trackSpaces = useGameStore((state) => state.trackSpaces)
  const territoryInfo = useGameStore((state) => state.territoryInfo)
  const rollDice = useGameStore((state) => state.rollDice)
  const purchaseTerritory = useGameStore((state) => state.purchaseTerritory)
  const endTurn = useGameStore((state) => state.endTurn)
  const ownershipByTerritory = useGameStore((state) => state.ownershipByTerritory)
  const lastEvent = useGameStore((state) => state.lastEvent)
  const selectedTerritoryId = useMapInteractionsStore((state) => state.selectedTerritory)

  const currentPlayer = players[currentPlayerIndex] ?? null
  const currentSpace = currentPlayer ? trackSpaces[currentPlayer.position] : null
  const selectedOwnerId = selectedTerritoryId ? ownershipByTerritory[selectedTerritoryId] ?? null : null
  const selectedTerritory = selectedTerritoryId ? territoryInfo[selectedTerritoryId] ?? null : null
  const selectedOwnerName = selectedOwnerId
    ? players.find((player) => player.id === selectedOwnerId)?.name ?? selectedOwnerId
    : null
  const selectedOffer = useMemo(() => {
    if (!selectedTerritoryId) {
      return null
    }
    if (selectedOwnerId) {
      return null
    }
    return selectedTerritory ?? null
  }, [selectedOwnerId, selectedTerritory, selectedTerritoryId])

  const canPurchaseSelected = selectedOffer && currentPlayer ? currentPlayer.money >= selectedOffer.cost : false
  const selectedShortfall =
    !canPurchaseSelected && selectedOffer && currentPlayer ? selectedOffer.cost - currentPlayer.money : null
  const selectedTerritoryName = selectedTerritory?.name ?? selectedTerritoryId ?? ''
  const selectedOwnershipLabel = selectedOwnerId
    ? selectedOwnerId === currentPlayer?.id
      ? 'Owned by you'
      : `Owned by ${selectedOwnerName ?? selectedOwnerId}`
    : null

  return (
    <section className="hud-panel">
      <header className="hud-panel__header">
        <div>
          <h2>Turn Controls</h2>
          <span className="hud-panel__sub">{currentPlayer ? `${currentPlayer.name}'s turn` : 'Waiting for map'}</span>
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
            <strong>{lastEvent.kind === 'bonus' ? 'Reward' : 'Penalty'}</strong>
            <p>{lastEvent.description}</p>
          </div>
          <span className="event-banner__amount">
            {`${lastEvent.kind === 'bonus' ? '+' : '-'}${currency.format(lastEvent.amount)}`}
          </span>
        </div>
      )}
      <div className="turn-actions">
        <button type="button" onClick={rollDice} disabled={turnPhase !== 'awaiting-roll' || !currentPlayer}>
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
                  onClick={() => purchaseTerritory(selectedOffer.id)}
                  disabled={!canPurchaseSelected}
                >
                  Purchase
                </button>
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={endTurn} disabled={turnPhase !== 'awaiting-end-turn'}>
          End turn
        </button>
      </div>
    </section>
  )
}

export default TurnControls
