import { type FormEvent, useState } from 'react'
import { nanoid } from 'nanoid'
import { useMapEditorStore } from '../state/useMapEditorStore'

const DEFAULT_COLORS = ['#f39c12', '#3498db', '#1abc9c', '#9b59b6', '#e74c3c', '#2ecc71']

const StateSidebar = () => {
  const map = useMapEditorStore((state) => state.map)
  const selectedStateId = useMapEditorStore((state) => state.selectedStateId)
  const setSelectedState = useMapEditorStore((state) => state.setSelectedState)
  const upsertState = useMapEditorStore((state) => state.upsertState)
  const removeState = useMapEditorStore((state) => state.removeState)

  const [draftName, setDraftName] = useState('')
  const [draftColorIndex, setDraftColorIndex] = useState(0)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draftName.trim()) {
      return
    }

    const nextId = draftName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || nanoid(6)

    upsertState({
      id: nextId,
      name: draftName.trim(),
      displayColor: DEFAULT_COLORS[draftColorIndex % DEFAULT_COLORS.length],
      hexIds: [],
    })

    setSelectedState(nextId)
    setDraftName('')
    setDraftColorIndex((current) => (current + 1) % DEFAULT_COLORS.length)
  }

  return (
    <aside className="state-sidebar">
      <header className="state-sidebar__header">
        <h2>States</h2>
        <span className="state-sidebar__count">{map.states.length}</span>
      </header>

      <ul className="state-sidebar__list">
        {map.states.map((state) => {
          const isActive = state.id === selectedStateId
          return (
            <li key={state.id} className={isActive ? 'state-item state-item--active' : 'state-item'}>
              <button
                type="button"
                className="state-item__select"
                onClick={() => setSelectedState(isActive ? null : state.id)}
              >
                <span className="state-item__swatch" style={{ backgroundColor: state.displayColor }} />
                <div className="state-item__meta">
                  <strong>{state.name}</strong>
                  <span>{state.hexIds.length} hexes</span>
                </div>
              </button>
              <button
                type="button"
                className="state-item__remove"
                onClick={() => removeState(state.id)}
                aria-label={`Remove ${state.name}`}
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>

      <form className="state-sidebar__form" onSubmit={handleSubmit}>
        <label htmlFor="state-name">New state</label>
        <input
          id="state-name"
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder="Enter state name"
        />
        <button type="submit" className="state-sidebar__add">
          Add state
        </button>
      </form>
    </aside>
  )
}

export default StateSidebar
