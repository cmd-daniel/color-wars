import { useState, type ChangeEvent } from "react";
import { useMapEditorStore } from "../state/useMapEditorStore";

const SvgImportPanel = () => {
  const svgDocument = useMapEditorStore((state) => state.svgDocument);
  const loadSvgDocument = useMapEditorStore((state) => state.loadSvgDocument);
  const clearSvgDocument = useMapEditorStore((state) => state.clearSvgDocument);
  const generateHexesFromSvg = useMapEditorStore((state) => state.generateHexesFromSvg);

  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      loadSvgDocument(text);
      setError(null);
    } catch (err) {
      console.error("Failed to parse SVG", err);
      setError("Failed to parse SVG file. Please ensure it contains valid <path> geometry.");
    }
  };

  const handleReset = () => {
    clearSvgDocument();
    setError(null);
  };

  return (
    <section className="panel panel--import">
      <header>
        <h3>SVG Source</h3>
        <div className="panel__actions">
          <label className="file-input">
            <input type="file" accept="image/svg+xml" onChange={handleFileChange} />
            <span>Load SVG</span>
          </label>
          {svgDocument && (
            <button type="button" className="ghost" onClick={handleReset}>
              Clear
            </button>
          )}
        </div>
      </header>
      {svgDocument ? (
        <div className="panel__content">
          <dl className="stats">
            <div>
              <dt>ViewBox</dt>
              <dd>
                {svgDocument.viewBox.x},{svgDocument.viewBox.y} →{svgDocument.viewBox.width}×
                {svgDocument.viewBox.height}
              </dd>
            </div>
            <div>
              <dt>Paths</dt>
              <dd>{svgDocument.paths.length}</dd>
            </div>
          </dl>
          <button type="button" onClick={generateHexesFromSvg}>
            Populate hexes
          </button>
          <p className="panel__helper">
            Adjust grid size and offsets before sampling so the hex lattice aligns with your
            artwork.
          </p>
        </div>
      ) : (
        <div className="panel__content">
          <p className="panel__placeholder">Import an SVG to begin sampling hex cells.</p>
          <p className="panel__helper">
            Need a quick demo? Load <code>/sample-regions.svg</code> from the public folder.
          </p>
        </div>
      )}
      {error && <p className="panel__error">{error}</p>}
    </section>
  );
};

export default SvgImportPanel;
