import { type ChangeEvent } from 'react'
import { useMapEditorStore } from '../state/useMapEditorStore'

const GridControls = () => {
  const gridOverlay = useMapEditorStore((state) => state.gridOverlay)
  const setGridOverlay = useMapEditorStore((state) => state.setGridOverlay)

  const handleNumberChange = (key: 'hexSize' | 'offsetX' | 'offsetY') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseFloat(event.target.value)
      if (Number.isNaN(value)) {
        return
      }
      setGridOverlay({ [key]: value } as Partial<typeof gridOverlay>)
    }

  const handleOrientationChange = (orientation: 'pointy' | 'flat') => () => {
    setGridOverlay({ orientation })
  }

  return (
    <section className="panel panel--grid">
      <header>
        <h3>Grid Controls</h3>
      </header>
      <div className="panel__content panel__content--grid">
        <div className="field-group">
          <span className="label">Orientation</span>
          <div className="segmented">
            <button
              type="button"
              className={gridOverlay.orientation === 'pointy' ? 'segmented__option active' : 'segmented__option'}
              onClick={handleOrientationChange('pointy')}
            >
              Pointy
            </button>
            <button
              type="button"
              className={gridOverlay.orientation === 'flat' ? 'segmented__option active' : 'segmented__option'}
              onClick={handleOrientationChange('flat')}
            >
              Flat
            </button>
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="grid-size">Hex size</label>
          <input
            id="grid-size"
            type="number"
            min={2}
            step={1}
            value={gridOverlay.hexSize}
            onChange={handleNumberChange('hexSize')}
          />
        </div>
        <div className="field-group field-group--inline">
          <label htmlFor="offset-x">Offset X</label>
          <input
            id="offset-x"
            type="number"
            step={1}
            value={gridOverlay.offsetX}
            onChange={handleNumberChange('offsetX')}
          />
        </div>
        <div className="field-group field-group--inline">
          <label htmlFor="offset-y">Offset Y</label>
          <input
            id="offset-y"
            type="number"
            step={1}
            value={gridOverlay.offsetY}
            onChange={handleNumberChange('offsetY')}
          />
        </div>
      </div>
    </section>
  )
}

export default GridControls
