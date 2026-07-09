import type { QueryResult, StatementOutcome } from "../engine/db";
import { resultToCsv } from "../lib/csv";

interface Props {
  outcomes: StatementOutcome[];
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Uint8Array) return `«blob ${value.length} bytes»`;
  return String(value);
}

function downloadCsv(result: QueryResult, index: number): void {
  const blob = new Blob([resultToCsv(result)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `result-${index + 1}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ResultsTable({ outcomes }: Props) {
  if (outcomes.length === 0) {
    return (
      <div className="results-empty">
        Run a query with <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> or the{" "}
        <strong>Run</strong> button.
      </div>
    );
  }

  return (
    <div className="results">
      {outcomes.map((outcome, i) => (
        <div className="result-block" key={i}>
          <div className="result-sql" title={outcome.sql}>
            {outcome.sql.length > 120
              ? outcome.sql.slice(0, 120) + "…"
              : outcome.sql}
          </div>

          {outcome.error ? (
            <div className="result-error">✗ {outcome.error}</div>
          ) : outcome.result ? (
            <>
              <div className="result-meta">
                {outcome.result.rows.length} row
                {outcome.result.rows.length === 1 ? "" : "s"} ·{" "}
                {outcome.elapsedMs.toFixed(1)} ms
                <button
                  className="link-btn"
                  onClick={() => downloadCsv(outcome.result!, i)}
                >
                  ⭳ CSV
                </button>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th className="rownum">#</th>
                      {outcome.result.columns.map((c, ci) => (
                        <th key={ci}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {outcome.result.rows.map((row, ri) => (
                      <tr key={ri}>
                        <td className="rownum">{ri + 1}</td>
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className={cell === null ? "null-cell" : ""}
                          >
                            {formatCell(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="result-meta ok">
              ✓ OK · {outcome.rowsModified} row
              {outcome.rowsModified === 1 ? "" : "s"} affected ·{" "}
              {outcome.elapsedMs.toFixed(1)} ms
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
