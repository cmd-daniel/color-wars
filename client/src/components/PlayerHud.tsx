import { type ChangeEvent } from 'react'
import { useGameStore } from '@/stores/gameStore'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const PlayerHud = () => {
  const players = useGameStore((state) => state.players)
  const playerColors = useGameStore((state) => state.playerColors)
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex)
  const configurePlayers = useGameStore((state) => state.configurePlayers)

  const handlePlayerCountChange = (event: ChangeEvent<HTMLSelectElement>) => {
    configurePlayers(Number.parseInt(event.target.value, 10))
  }

  return (
    <section className="hud-panel">
      <header className="hud-panel__header">
        <div>
          <h2>Players</h2>
          <span className="hud-panel__sub">Turn order</span>
        </div>
        <label className="hud-panel__config">
          <span>Count</span>
          <select onChange={handlePlayerCountChange} value={players.length}>
            {[2, 3, 4].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
      </header>
      <ul className="player-list">
        {players.map((player, index) => {
          const color = playerColors[player.id] ?? '#38bdf8'
          const isActive = index === currentPlayerIndex
          const territoryCount = player.ownedTerritories.length
          return (
            <li
              key={player.id}
              className={isActive ? 'player-card player-card--active' : 'player-card'}
              style={{ borderColor: color }}
            >
              <div className="player-card__header">
                <span className="player-card__token" style={{ backgroundColor: color }}>
                  {player.id.replace('P', '')}
                </span>
                <div>
                  <strong>{player.name}</strong>
                  <p>{currency.format(player.money)}</p>
                </div>
              </div>
              <div className="player-card__meta">
                <span>
                  Territories <strong>{territoryCount}</strong>
                </span>
                <span>
                  Position <strong>{player.position}</strong>
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default PlayerHud
