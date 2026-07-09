const HISTORY_KEY = "sqlplay.history.v1";
const SOLVED_KEY = "sqlplay.solved.v1";
const MAX_HISTORY = 50;

export interface HistoryEntry {
  sql: string;
  datasetId: string;
  /** Millisecond timestamp captured by the caller (avoids Date in libs). */
  at: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

export function loadHistory(): HistoryEntry[] {
  return read<HistoryEntry[]>(HISTORY_KEY, []);
}

export function pushHistory(entry: HistoryEntry): HistoryEntry[] {
  const existing = loadHistory().filter((e) => e.sql !== entry.sql);
  const next = [entry, ...existing].slice(0, MAX_HISTORY);
  write(HISTORY_KEY, next);
  return next;
}

export function clearHistory(): void {
  write(HISTORY_KEY, []);
}

export function loadSolved(): Record<string, boolean> {
  return read<Record<string, boolean>>(SOLVED_KEY, {});
}

export function markSolved(id: string): Record<string, boolean> {
  const solved = loadSolved();
  solved[id] = true;
  write(SOLVED_KEY, solved);
  return solved;
}
