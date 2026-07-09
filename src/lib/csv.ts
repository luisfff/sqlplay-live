import type { QueryResult } from "../engine/db";

/** Escape a value for a CSV cell (RFC-4180 style). */
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Uint8Array ? `blob(${v.length})` : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/** Serialize a result set to CSV text. */
export function resultToCsv(result: QueryResult): string {
  const header = result.columns.map(csvCell).join(",");
  const body = result.rows.map((r) => r.map(csvCell).join(",")).join("\n");
  return body ? header + "\n" + body : header;
}

/**
 * Parse CSV text into a header row + data rows. Handles quoted fields,
 * embedded commas/newlines, and doubled quotes.
 */
export function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") pushField();
    else if (ch === "\n") pushRow();
    else if (ch === "\r") {
      /* ignore, handled by \n */
    } else field += ch;
  }
  // Flush trailing field/row if the file didn't end with a newline.
  if (field !== "" || row.length > 0) pushRow();

  // Drop a trailing empty row produced by a final newline.
  const clean = rows.filter(
    (r) => !(r.length === 1 && r[0].trim() === "")
  );
  const header = clean.shift() ?? [];
  return { header, rows: clean };
}

/** Guess a SQLite column affinity from sampled values. */
function inferType(values: string[]): "INTEGER" | "REAL" | "TEXT" {
  let sawNumber = false;
  for (const v of values) {
    if (v === "" || v == null) continue;
    if (!/^-?\d+$/.test(v.trim())) {
      if (/^-?\d*\.\d+$/.test(v.trim())) {
        sawNumber = true;
        return "REAL";
      }
      return "TEXT";
    }
    sawNumber = true;
  }
  return sawNumber ? "INTEGER" : "TEXT";
}

function sanitizeIdent(name: string, fallback: string): string {
  const cleaned = name.trim().replace(/[^A-Za-z0-9_]/g, "_");
  if (!cleaned || /^\d/.test(cleaned)) return fallback + (cleaned ? "_" + cleaned : "");
  return cleaned;
}

/** Build CREATE TABLE + INSERT statements for a CSV file. */
export function csvToSql(fileName: string, text: string): string {
  const { header, rows } = parseCsv(text);
  if (header.length === 0) throw new Error("CSV has no header row.");

  const base = fileName.replace(/\.[^.]+$/, "");
  const table = sanitizeIdent(base, "imported");
  const cols = header.map((h, i) => sanitizeIdent(h, `col${i + 1}`));
  const types = cols.map((_, ci) =>
    inferType(rows.map((r) => r[ci] ?? ""))
  );

  const ddl = `CREATE TABLE "${table}" (\n${cols
    .map((c, i) => `  "${c}" ${types[i]}`)
    .join(",\n")}\n);`;

  const lit = (v: string | undefined, type: string) => {
    if (v === undefined || v === "") return "NULL";
    if (type === "TEXT") return "'" + v.replace(/'/g, "''") + "'";
    return v.trim();
  };

  const values = rows
    .map(
      (r) => `(${cols.map((_, ci) => lit(r[ci], types[ci])).join(", ")})`
    )
    .join(",\n");

  const dml = rows.length
    ? `INSERT INTO "${table}" (${cols
        .map((c) => `"${c}"`)
        .join(", ")}) VALUES\n${values};`
    : "";

  return dml ? ddl + "\n\n" + dml : ddl;
}

/** Build CREATE TABLE + INSERT statements for a JSON array of objects. */
export function jsonToSql(fileName: string, text: string): string {
  const data = JSON.parse(text) as Record<string, unknown>[];
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("JSON must be a non-empty array of objects.");
  }
  const keySet = new Set<string>();
  for (const obj of data) Object.keys(obj ?? {}).forEach((k) => keySet.add(k));
  const keys: string[] = Array.from(keySet);
  const base = fileName.replace(/\.[^.]+$/, "");
  const table = sanitizeIdent(base, "imported");
  const cols = keys.map((k, i) => sanitizeIdent(k, `col${i + 1}`));

  const typeOf = (k: string): "INTEGER" | "REAL" | "TEXT" => {
    let real = false;
    for (const obj of data) {
      const v = obj?.[k];
      if (v == null) continue;
      if (typeof v !== "number") return "TEXT";
      if (!Number.isInteger(v)) real = true;
    }
    return real ? "REAL" : "INTEGER";
  };
  const types = keys.map(typeOf);

  const ddl = `CREATE TABLE "${table}" (\n${cols
    .map((c, i) => `  "${c}" ${types[i]}`)
    .join(",\n")}\n);`;

  const lit = (v: unknown, type: string) => {
    if (v == null) return "NULL";
    if (type === "TEXT")
      return "'" + String(typeof v === "object" ? JSON.stringify(v) : v).replace(/'/g, "''") + "'";
    return String(v);
  };

  const values = data
    .map(
      (obj: Record<string, unknown>) =>
        `(${keys.map((k, i) => lit(obj?.[k], types[i])).join(", ")})`
    )
    .join(",\n");

  return (
    ddl +
    `\n\nINSERT INTO "${table}" (${cols
      .map((c) => `"${c}"`)
      .join(", ")}) VALUES\n${values};`
  );
}
