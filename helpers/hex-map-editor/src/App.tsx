import { type ChangeEvent, useEffect, useState } from 'react'
import HexPreview from './components/HexPreview'
import StateSidebar from './components/StateSidebar'
import SvgImportPanel from './components/SvgImportPanel'
import GridControls from './components/GridControls'
import PaintControls from './components/PaintControls'
import ValidationPanel from './components/ValidationPanel'
import { useMapEditorStore } from './state/useMapEditorStore'
import type { MapConfig } from './schema/mapConfig'
import './App.css'

const App = () => {
  const map = useMapEditorStore((state) => state.map)
  const importMap = useMapEditorStore((state) => state.importMap)
  const validationIssues = useMapEditorStore((state) => state.validationIssues)
  const updateMapMetadata = useMapEditorStore((state) => state.updateMapMetadata)

  const [metadataDraft, setMetadataDraft] = useState(() =>
    map.metadata ? JSON.stringify(map.metadata, null, 2) : '',
  )
  const [metadataError, setMetadataError] = useState<string | null>(null)

  useEffect(() => {
    setMetadataDraft(map.metadata ? JSON.stringify(map.metadata, null, 2) : '')
    setMetadataError(null)
  }, [map.metadata])

  const handleMetadataFieldChange = (field: 'id' | 'name' | 'version') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      updateMapMetadata({ [field]: event.target.value } as Partial<Pick<MapConfig, 'id' | 'name' | 'version'>>)
    }

  const handleMetadataDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMetadataDraft(event.target.value)
  }

  const handleMetadataDraftBlur = () => {
    const trimmed = metadataDraft.trim()
    if (!trimmed) {
      updateMapMetadata({ metadata: undefined })
      setMetadataError(null)
      return
    }

    try {
      const parsed = JSON.parse(trimmed)
      updateMapMetadata({ metadata: parsed })
      setMetadataError(null)
    } catch (error) {
      console.error('Invalid metadata JSON', error)
      setMetadataError('Invalid JSON. Please provide a valid JSON object or clear the field.')
    }
  }

  const handleExport = () => {
    const blocking = validationIssues.filter((issue) => issue.level === 'error')
    if (blocking.length > 0) {
      const proceed = window.confirm(
        `There are ${blocking.length} blocking issue(s). Resolve them before export.\nPress OK to export anyway.`,
      )
      if (!proceed) {
        return
      }
    }
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
            <h2>Map metadata</h2>
            <form className="details-form" onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="map-name">
                <span>Map name</span>
                <input
                  id="map-name"
                  type="text"
                  value={map.name}
                  onChange={handleMetadataFieldChange('name')}
                />
              </label>
              <label htmlFor="map-id">
                <span>Map identifier</span>
                <input
                  id="map-id"
                  type="text"
                  value={map.id}
                  onChange={handleMetadataFieldChange('id')}
                />
              </label>
              <label htmlFor="map-version">
                <span>Version</span>
                <input
                  id="map-version"
                  type="text"
                  value={map.version}
                  onChange={handleMetadataFieldChange('version')}
                />
              </label>
              <label htmlFor="map-metadata">
                <span>Metadata JSON (optional)</span>
                <textarea
                  id="map-metadata"
                  value={metadataDraft}
                  onChange={handleMetadataDraftChange}
                  onBlur={handleMetadataDraftBlur}
                  placeholder={'{"description": "..."}'}
                />
              </label>
              {metadataError && <p className="metadata-error">{metadataError}</p>}
            </form>
            <p className="panel__helper">
              Orientation: <strong>{map.grid.orientation}</strong> | Hex size:{' '}
              <strong>{map.grid.hexSize}</strong>
            </p>
          </section>
          <ValidationPanel />
        </main>
      </div>
    </div>
  )
}

export default App
