import { useMemo } from 'react'
import { useGameStore } from '@/stores/gameStore'
import type { GameLogEntry } from '@/types/game'

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const GameLog = () => {
  const logs = useGameStore((state) => state.logs)

  const items = useMemo(() => [...logs].reverse(), [logs])

  if (items.length === 0) {
    return (
      <section className="hud-panel game-log">
        <header className="hud-panel__header">
          <div>
            <h2>Game Log</h2>
            <span className="hud-panel__sub">No activity yet</span>
          </div>
        </header>
        <p className="game-log__empty">Roll the dice to begin recording turns.</p>
      </section>
    )
  }

  return (
    <section className="hud-panel game-log">
      <header className="hud-panel__header">
        <div>
          <h2>Game Log</h2>
          <span className="hud-panel__sub">Most recent first</span>
        </div>
      </header>
      <ul className="game-log__list">
        {items.map((entry: GameLogEntry) => (
          <li key={entry.id} className={`game-log__item game-log__item--${entry.type}`}>
            <div className="game-log__meta">
              <span className="game-log__time">{formatTime(entry.timestamp)}</span>
              <span className="game-log__tag">{entry.type}</span>
            </div>
            <p className="game-log__message">{entry.message}</p>
            {entry.detail && <p className="game-log__detail">{entry.detail}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default GameLog
