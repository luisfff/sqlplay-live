import { useState } from "react";
import type { Challenge } from "../data/challenges";
import type { CompareResult } from "../lib/compare";
import { findDataset } from "../data/samples";

const DIFF_RANK: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };

interface ListProps {
  challenges: Challenge[];
  activeId: string | null;
  solved: Record<string, boolean>;
  onSelect: (c: Challenge) => void;
}

export function ChallengeList({
  challenges,
  activeId,
  solved,
  onSelect,
}: ListProps) {
  const solvedCount = challenges.filter((c) => solved[c.id]).length;

  // Group by dataset (preserving first-seen order), sort each by difficulty.
  const order: string[] = [];
  const groups: Record<string, Challenge[]> = {};
  for (const c of challenges) {
    if (!groups[c.datasetId]) {
      groups[c.datasetId] = [];
      order.push(c.datasetId);
    }
    groups[c.datasetId].push(c);
  }
  for (const id of order) {
    groups[id].sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty]);
  }

  return (
    <div className="challenge-list">
      <div className="challenge-progress">
        Solved {solvedCount}/{challenges.length}
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${(solvedCount / challenges.length) * 100}%` }}
          />
        </div>
      </div>
      {order.map((datasetId) => (
        <div key={datasetId} className="challenge-group">
          <div className="challenge-group-title">
            {findDataset(datasetId).name}
          </div>
          <ul>
            {groups[datasetId].map((c) => (
              <li
                key={c.id}
                className={c.id === activeId ? "active" : ""}
                onClick={() => onSelect(c)}
              >
                <span className="check">{solved[c.id] ? "✓" : "○"}</span>
                <span className="challenge-title-text">{c.title}</span>
                <span className={`diff-dot ${c.difficulty.toLowerCase()}`} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

interface BarProps {
  challenge: Challenge;
  feedback: CompareResult | null;
  onCheck: () => void;
  onShowSolution: () => void;
}

export function ChallengeBar({
  challenge,
  feedback,
  onCheck,
  onShowSolution,
}: BarProps) {
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="challenge-bar">
      <div className="challenge-head">
        <span className={`diff-badge ${challenge.difficulty.toLowerCase()}`}>
          {challenge.difficulty}
        </span>
        <strong>{challenge.title}</strong>
      </div>
      <p className="challenge-prompt">{challenge.prompt}</p>

      <div className="challenge-actions">
        <button className="btn primary" onClick={onCheck}>
          ✓ Check answer
        </button>
        {challenge.hint && (
          <button className="btn" onClick={() => setShowHint((h) => !h)}>
            {showHint ? "Hide hint" : "Hint"}
          </button>
        )}
        <button className="btn" onClick={onShowSolution}>
          Show solution
        </button>
      </div>

      {showHint && challenge.hint && (
        <div className="challenge-hint">💡 {challenge.hint}</div>
      )}

      {feedback && (
        <div
          className={`challenge-feedback ${feedback.pass ? "pass" : "fail"}`}
        >
          {feedback.pass ? "✓ " : "✗ "}
          {feedback.reason}
        </div>
      )}
    </div>
  );
}
