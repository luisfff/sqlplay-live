#!/usr/bin/env node
// Generates ER-diagram SVGs for every sample dataset into docs/.
// Single source of truth: src/data/samples.ts (transpiled on the fly), and
// the same layout constants as src/components/ERDiagram.tsx.
import initSqlJs from "sql.js";
import { transform } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const BOX_W = 200,
  HEADER_H = 30,
  ROW_H = 22,
  PAD_BOTTOM = 10,
  GAP_X = 70,
  GAP_Y = 55,
  MARGIN = 24;

async function loadSamples() {
  const ts = await readFile(join(ROOT, "src/data/samples.ts"), "utf8");
  const { code } = await transform(ts, { loader: "ts", format: "esm" });
  const mod = await import(
    "data:text/javascript," + encodeURIComponent(code)
  );
  return mod.SAMPLE_DATASETS;
}

function introspect(db) {
  const tablesRes = db.exec(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  );
  if (tablesRes.length === 0) return { tables: [], fks: [] };
  const tables = [];
  const fks = [];
  for (const [name] of tablesRes[0].values) {
    const info = db.exec(`PRAGMA table_info("${name}")`);
    const columns = info.length
      ? info[0].values.map((r) => ({
          name: String(r[1]),
          type: String(r[2] || ""),
          pk: Number(r[5]) > 0,
        }))
      : [];
    tables.push({ name, columns });
    const fkList = db.exec(`PRAGMA foreign_key_list("${name}")`);
    if (fkList.length)
      for (const r of fkList[0].values)
        fks.push({
          fromTable: name,
          fromColumn: String(r[3]),
          toTable: String(r[2]),
        });
  }
  return { tables, fks };
}

const boxHeight = (t) => HEADER_H + t.columns.length * ROW_H + PAD_BOTTOM;

function borderPoint(b, tx, ty) {
  const cx = b.x + b.w / 2,
    cy = b.y + b.h / 2;
  const dx = tx - cx,
    dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const t = 1 / Math.max(Math.abs(dx) / (b.w / 2), Math.abs(dy) / (b.h / 2));
  return { x: cx + dx * t, y: cy + dy * t };
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function layout(tables) {
  const cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(tables.length))));
  const rows = Math.ceil(tables.length / cols);
  const rowHeights = Array.from({ length: rows }, () => 0);
  tables.forEach((t, i) => {
    const r = Math.floor(i / cols);
    rowHeights[r] = Math.max(rowHeights[r], boxHeight(t));
  });
  const rowY = [];
  let acc = MARGIN;
  for (let r = 0; r < rows; r++) {
    rowY[r] = acc;
    acc += rowHeights[r] + GAP_Y;
  }
  const boxes = tables.map((t, i) => ({
    table: t,
    x: MARGIN + (i % cols) * (BOX_W + GAP_X),
    y: rowY[Math.floor(i / cols)],
    w: BOX_W,
    h: boxHeight(t),
  }));
  const width = MARGIN * 2 + cols * BOX_W + (cols - 1) * GAP_X;
  const height = acc - GAP_Y + MARGIN;
  return { boxes, width, height };
}

function renderSvg({ tables, fks }) {
  const { boxes, width, height } = layout(tables);
  const byName = new Map(boxes.map((b) => [b.table.name, b]));
  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#0d1117"/>`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#2f81f7"/></marker></defs>`
  );

  for (const fk of fks) {
    const a = byName.get(fk.fromTable);
    const b = byName.get(fk.toTable);
    if (!a || !b) continue;
    const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
    const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const p1 = borderPoint(a, bc.x, bc.y);
    const p2 = borderPoint(b, ac.x, ac.y);
    parts.push(
      `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(
        1
      )}" y2="${p2.y.toFixed(
        1
      )}" stroke="#2f81f7" stroke-width="1.5" opacity="0.8" marker-end="url(#arrow)"/>`
    );
  }

  for (const b of boxes) {
    const fkCols = new Set(
      fks.filter((f) => f.fromTable === b.table.name).map((f) => f.fromColumn)
    );
    parts.push(
      `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="#161b22" stroke="#2d333b"/>`,
      `<path d="M ${b.x + 8} ${b.y} h ${b.w - 16} a 8 8 0 0 1 8 8 v ${
        HEADER_H - 8
      } h ${-b.w} v ${-(HEADER_H - 8)} a 8 8 0 0 1 8 -8 z" fill="#1f6feb"/>`,
      `<text x="${b.x + 10}" y="${
        b.y + 20
      }" fill="#fff" font-size="13" font-weight="700" font-family="monospace">${esc(
        b.table.name
      )}</text>`
    );
    b.table.columns.forEach((col, ci) => {
      const cy = b.y + HEADER_H + ci * ROW_H + 15;
      const marker = col.pk ? "🔑 " : fkCols.has(col.name) ? "↪ " : "";
      parts.push(
        `<text x="${b.x + 10}" y="${cy}" fill="${
          col.pk ? "#f0c674" : "#e6edf3"
        }" font-size="12" font-family="monospace">${esc(marker + col.name)}</text>`,
        `<text x="${b.x + b.w - 10}" y="${cy}" fill="#8b949e" font-size="11" font-family="monospace" text-anchor="end">${esc(
          col.type
        )}</text>`
      );
    });
  }

  parts.push("</svg>");
  return parts.join("\n");
}

async function main() {
  const SQL = await initSqlJs();
  const datasets = await loadSamples();
  await mkdir(join(ROOT, "docs"), { recursive: true });
  for (const ds of datasets) {
    if (!ds.sql || !ds.sql.trim()) continue;
    const db = new SQL.Database();
    db.exec(ds.sql);
    const model = introspect(db);
    db.close();
    if (model.tables.length === 0) continue;
    const svg = renderSvg(model);
    const out = join(ROOT, "docs", `schema-${ds.id}.svg`);
    await writeFile(out, svg, "utf8");
    console.log(
      `wrote docs/schema-${ds.id}.svg  (${model.tables.length} tables, ${model.fks.length} FKs)`
    );
  }
}

main();
