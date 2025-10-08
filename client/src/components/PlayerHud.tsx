import { useMemo } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import type { GamePlayer } from '@/stores/sessionStore'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const EMPTY_PLAYERS: GamePlayer[] = []

const PlayerHud = () => {
  const roomView = useSessionStore((state) => state.roomView)
  const sessionId = useSessionStore((state) => state.sessionId)

  const orderedPlayers = useMemo(() => {
    if (!roomView) {
      return EMPTY_PLAYERS
    }
    const players = roomView.players ?? EMPTY_PLAYERS
    if (!roomView.playerOrder?.length) {
      return players
    }
    const lookup = new Map(players.map((player) => [player.sessionId, player]))
    const ordered = roomView.playerOrder
      .map((playerId) => lookup.get(playerId))
      .filter((player): player is NonNullable<(typeof players)[number]> => Boolean(player))
    const remaining = players.filter((player) => !lookup.has(player.sessionId))
    return [...ordered, ...remaining]
  }, [roomView])

  const currentTurnId = roomView?.currentTurn ?? null

  return (
    <section className="hud-panel">
      <header className="hud-panel__header">
        <div>
          <h2>Players</h2>
          <span className="hud-panel__sub">{roomView?.phase === 'active' ? 'In play' : 'Lobby state'}</span>
        </div>
      </header>
      <ul className="player-list">
        {orderedPlayers.map((player, index) => {
          const color = roomView?.playerColors[player.sessionId] ?? player.color ?? '#38bdf8'
          const isActive = player.sessionId === currentTurnId
          const territoryCount = player.ownedTerritories.length
          const isSelf = player.sessionId === sessionId
          const positionLabel = player.position === 0 ? 'Launch' : player.position
          return (
            <li
              key={player.sessionId}
              className={isActive ? 'player-card player-card--active' : 'player-card'}
              style={{ borderColor: color }}
            >
              <div className="player-card__header">
                <span className="player-card__token" style={{ backgroundColor: color }}>
                  {index + 1}
                </span>
                <div>
                  <strong>{player.name}{isSelf ? ' (You)' : ''}</strong>
                  <p>{currency.format(player.money)}</p>
                </div>
              </div>
              <div className="player-card__meta">
                <span>
                  Territories <strong>{territoryCount}</strong>
                </span>
                <span>
                  Position <strong>{positionLabel}</strong>
                </span>
              </div>
              {roomView?.phase !== 'active' && (
                <div className="player-card__meta">
                  <span>Status</span>
                  <strong>{player.connected ? (player.ready ? 'Ready' : 'Waiting') : 'Reconnecting'}</strong>
                </div>
              )}
            </li>
          )
        })}
        {orderedPlayers.length === 0 && (
          <li className="player-card player-card--empty">
            <div className="player-card__header">
              <strong>No players yet</strong>
              <p>Host or join a lobby to get started.</p>
            </div>
          </li>
        )}
      </ul>
    </section>
  )
}

export default PlayerHud
