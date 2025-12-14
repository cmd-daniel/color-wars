import { useMemo } from "react";
import { useMapEditorStore } from "../state/useMapEditorStore";
import type { ValidationIssue } from "../utils/validation";

const LEVEL_ORDER: Record<ValidationIssue["level"], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const LEVEL_LABEL: Record<ValidationIssue["level"], string> = {
  error: "Error",
  warning: "Warning",
  info: "Info",
};

const ValidationPanel = () => {
  const issues = useMapEditorStore((state) => state.validationIssues);
  const territories = useMapEditorStore((state) => state.map.territories);

  const sortedIssues = useMemo(
    () => [...issues].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]),
    [issues],
  );

  if (sortedIssues.length === 0) {
    return (
      <section className="panel panel--validation">
        <header>
          <h3>Validation</h3>
        </header>
        <p className="panel__helper">No issues detected. Ready to export.</p>
      </section>
    );
  }

  return (
    <section className="panel panel--validation">
      <header>
        <h3>Validation</h3>
        <span className="tag tag--alert">
          {sortedIssues.length} issue{sortedIssues.length > 1 ? "s" : ""}
        </span>
      </header>
      <ul className="validation-list">
        {sortedIssues.map((issue, index) => {
          const territory = issue.stateId
            ? territories.find((entry) => entry.id === issue.stateId)
            : undefined;
          return (
            <li
              key={`${issue.type}-${issue.stateId ?? "global"}-${index}`}
              className={`validation-item validation-item--${issue.level}`}
            >
              <div className="validation-item__header">
                <span className="validation-item__badge">{LEVEL_LABEL[issue.level]}</span>
                {issue.stateId && (
                  <span className="validation-item__entity">
                    {territory ? territory.name : issue.stateId}
                  </span>
                )}
              </div>
              <p>{issue.message}</p>
              {issue.hexKeys && issue.hexKeys.length > 0 && (
                <p className="validation-item__extra">
                  Examples: {issue.hexKeys.join(", ")}
                  {issue.hexKeys.length >= 12 ? "…" : ""}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ValidationPanel;
