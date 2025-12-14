import { type FormEvent, useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { useMapEditorStore } from "../state/useMapEditorStore";

const DEFAULT_COLORS = ["#f39c12", "#3498db", "#1abc9c", "#9b59b6", "#e74c3c", "#2ecc71"];

const StateSidebar = () => {
  const map = useMapEditorStore((state) => state.map);
  const selectedStateId = useMapEditorStore((state) => state.selectedStateId);
  const setSelectedState = useMapEditorStore((state) => state.setSelectedState);
  const upsertState = useMapEditorStore((state) => state.upsertState);
  const removeState = useMapEditorStore((state) => state.removeState);
  const interactionMode = useMapEditorStore((state) => state.interactionMode);

  const [draftName, setDraftName] = useState("");
  const [draftColorIndex, setDraftColorIndex] = useState(0);
  const selectedTerritory = useMemo(
    () => map.territories.find((t) => t.id === selectedStateId) ?? null,
    [map.territories, selectedStateId],
  );
  const [renameValue, setRenameValue] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (interactionMode === "view") {
      return;
    }
    if (!draftName.trim()) {
      return;
    }

    const nextId = draftName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || nanoid(6);

    upsertState({
      id: nextId,
      name: draftName.trim(),
      displayColor: DEFAULT_COLORS[draftColorIndex % DEFAULT_COLORS.length],
      hexes: [],
    });

    setSelectedState(nextId);
    setDraftName("");
    setDraftColorIndex((current) => (current + 1) % DEFAULT_COLORS.length);
  };

  useEffect(() => {
    setRenameValue(selectedTerritory?.name ?? "");
  }, [selectedTerritory?.id, selectedTerritory?.name]);

  const handleRenameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTerritory) {
      return;
    }
    if (interactionMode === "view") {
      return;
    }
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === selectedTerritory.name) {
      return;
    }
    upsertState({
      ...selectedTerritory,
      name: trimmed,
    });
  };

  const handleRenameBlur = () => {
    if (!selectedTerritory) {
      return;
    }
    if (interactionMode === "view") {
      return;
    }
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === selectedTerritory.name) {
      setRenameValue(selectedTerritory.name);
      return;
    }
    upsertState({
      ...selectedTerritory,
      name: trimmed,
    });
  };

  return (
    <aside className="state-sidebar">
      <header className="state-sidebar__header">
        <h2>Territories</h2>
        <span className="state-sidebar__count">{map.territories.length}</span>
      </header>

      <ul className="state-sidebar__list">
        {map.territories.map((territory) => {
          const isActive = territory.id === selectedStateId;
          return (
            <li
              key={territory.id}
              className={isActive ? "state-item state-item--active" : "state-item"}
            >
              <button
                type="button"
                className="state-item__select"
                onClick={() => setSelectedState(isActive ? null : territory.id)}
              >
                <span
                  className="state-item__swatch"
                  style={{ backgroundColor: territory.displayColor }}
                />
                <div className="state-item__meta">
                  <strong>{territory.name}</strong>
                  <span>{territory.hexes.length} hexes</span>
                </div>
              </button>
              <button
                type="button"
                className="state-item__remove"
                onClick={() => removeState(territory.id)}
                disabled={interactionMode === "view"}
                aria-label={`Remove ${territory.name}`}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      <form className="state-sidebar__form" onSubmit={handleSubmit}>
        <label htmlFor="state-name">New territory</label>
        <input
          id="state-name"
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder="Enter territory name"
          disabled={interactionMode === "view"}
        />
        <button type="submit" className="state-sidebar__add" disabled={interactionMode === "view"}>
          Add territory
        </button>
      </form>

      {selectedTerritory && (
        <form className="state-sidebar__form" onSubmit={handleRenameSubmit}>
          <label htmlFor="rename-territory">Rename territory</label>
          <input
            id="rename-territory"
            type="text"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onBlur={handleRenameBlur}
            placeholder="Territory name"
            disabled={interactionMode === "view"}
          />
          <button
            type="submit"
            className="state-sidebar__add"
            disabled={interactionMode === "view"}
          >
            Save name
          </button>
        </form>
      )}
      {selectedTerritory && (
        <section className="state-sidebar__adjacency">
          <h3>Adjacent territories</h3>
          {map.adjacencies[selectedTerritory.id]?.length ? (
            <ul className="adjacency-list">
              {map.adjacencies[selectedTerritory.id]?.map((neighbourId) => {
                const neighbour = map.territories.find((t) => t.id === neighbourId);
                const name = neighbour?.name ?? neighbourId;
                return (
                  <li key={neighbourId}>
                    <button
                      type="button"
                      onClick={() => setSelectedState(neighbourId)}
                      className="adjacency-pill"
                    >
                      {name}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="panel__placeholder">No neighbouring territories detected.</p>
          )}
        </section>
      )}
    </aside>
  );
};

export default StateSidebar;
