import { useMapEditorStore } from '../state/useMapEditorStore'

const MODE_LABELS: Record<'brush' | 'erase' | 'flood' | 'delete-hex', string> = {
  brush: 'Brush',
  erase: 'Erase owner',
  flood: 'Flood fill',
  'delete-hex': 'Delete hex',
}

const PaintControls = () => {
  const paintMode = useMapEditorStore((state) => state.paintMode)
  const setPaintMode = useMapEditorStore((state) => state.setPaintMode)
  const selectedStateId = useMapEditorStore((state) => state.selectedStateId)
  const interactionMode = useMapEditorStore((state) => state.interactionMode)
  const setInteractionMode = useMapEditorStore((state) => state.setInteractionMode)
  const territories = useMapEditorStore((state) => state.map.states)

  const selectedTerritoryName = selectedStateId
    ? territories.find((territory) => territory.id === selectedStateId)?.name ?? selectedStateId
    : null

  return (
    <section className="panel">
      <header>
        <h3>Painting</h3>
        <span className="tag">
          {interactionMode === 'view'
            ? 'View only'
            : selectedTerritoryName ?? 'No territory selected'}
        </span>
      </header>
      <div className="segmented">
        {(['view', 'edit'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={interactionMode === mode ? 'segmented__option active' : 'segmented__option'}
            onClick={() => setInteractionMode(mode)}
          >
            {mode === 'view' ? 'View' : 'Edit'}
          </button>
        ))}
      </div>
      <div className="segmented">
        {(['brush', 'erase', 'flood', 'delete-hex'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={paintMode === mode ? 'segmented__option active' : 'segmented__option'}
            onClick={() => setPaintMode(mode)}
            disabled={interactionMode === 'view'}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>
      {interactionMode === 'view' && <p className="panel__placeholder">Switch to edit mode to modify the map.</p>}
      {interactionMode === 'edit' && paintMode !== 'erase' && paintMode !== 'delete-hex' && !selectedStateId && (
        <p className="panel__placeholder">Select a territory in the sidebar to enable painting.</p>
      )}
      {paintMode === 'flood' && (
        <p className="panel__helper">
          Flood fill paints all connected hexes that currently share the clicked hex&apos;s original owner.
        </p>
      )}
      {paintMode === 'delete-hex' && interactionMode === 'edit' && (
        <p className="panel__helper">Delete removes the hex entirely from the grid and its state.</p>
      )}
    </section>
  )
}

export default PaintControls
