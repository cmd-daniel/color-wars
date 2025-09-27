import { type ChangeEvent } from 'react'
import HexPreview from './components/HexPreview'
import StateSidebar from './components/StateSidebar'
import SvgImportPanel from './components/SvgImportPanel'
import GridControls from './components/GridControls'
import PaintControls from './components/PaintControls'
import { useMapEditorStore } from './state/useMapEditorStore'
import type { MapConfig } from './schema/mapConfig'
import './App.css'

const App = () => {
  const map = useMapEditorStore((state) => state.map)
  const importMap = useMapEditorStore((state) => state.importMap)

  const handleExport = () => {
    const payload = JSON.stringify(map, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${map.id || 'map-config'}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? []
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as MapConfig
      importMap(parsed)
    } catch (error) {
      console.error('Failed to import map config', error)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <h1>Hex Map Editor</h1>
          <span className="app-shell__subtitle">Map configuration tooling</span>
        </div>
        <div className="app-shell__actions">
          <label className="file-input">
            <input type="file" accept="application/json" onChange={handleImport} />
            <span>Import JSON</span>
          </label>
          <button type="button" onClick={handleExport}>
            Export JSON
          </button>
        </div>
      </header>
      <div className="app-shell__body">
        <StateSidebar />
        <main className="app-shell__main">
          <section className="workspace">
            <div className="workspace__header">
              <h2>Workspace</h2>
              <span className="workspace__meta">{map.hexes.length} hexes</span>
            </div>
            <div className="workspace__toolbelt">
              <SvgImportPanel />
              <GridControls />
              <PaintControls />
            </div>
            <HexPreview />
          </section>
          <section className="details-panel">
            <h2>Map details</h2>
            <dl>
              <div>
                <dt>Map ID</dt>
                <dd>{map.id}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{map.version}</dd>
              </div>
              <div>
                <dt>Orientation</dt>
                <dd>{map.grid.orientation}</dd>
              </div>
              <div>
                <dt>Hex size</dt>
                <dd>{map.grid.hexSize}</dd>
              </div>
            </dl>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
