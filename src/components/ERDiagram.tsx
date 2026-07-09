import { useMemo, useRef } from "react";
import type { ForeignKey, TableInfo } from "../engine/db";

interface Props {
  schema: TableInfo[];
  foreignKeys: ForeignKey[];
}

const BOX_W = 200;
const HEADER_H = 30;
const ROW_H = 22;
const PAD_BOTTOM = 10;
const GAP_X = 70;
const GAP_Y = 55;
const MARGIN = 24;

interface Box {
  table: TableInfo;
  x: number;
  y: number;
  w: number;
  h: number;
}

function boxHeight(t: TableInfo): number {
  return HEADER_H + t.columns.length * ROW_H + PAD_BOTTOM;
}

/** Intersection of the box border with the line toward a target point. */
function borderPoint(b: Box, tx: number, ty: number) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const t = 1 / Math.max(Math.abs(dx) / (b.w / 2), Math.abs(dy) / (b.h / 2));
  return { x: cx + dx * t, y: cy + dy * t };
}

export function ERDiagram({ schema, foreignKeys }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { boxes, width, height, byName } = useMemo(() => {
    const tables = schema.filter((t) => t.kind === "table");
    const cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(tables.length))));
    const rows = Math.ceil(tables.length / cols);

    // Tallest box per grid row drives that row's height.
    const rowHeights: number[] = Array.from({ length: rows }, () => 0);
    tables.forEach((t, i) => {
      const r = Math.floor(i / cols);
      rowHeights[r] = Math.max(rowHeights[r], boxHeight(t));
    });
    const rowY: number[] = [];
    let acc = MARGIN;
    for (let r = 0; r < rows; r++) {
      rowY[r] = acc;
      acc += rowHeights[r] + GAP_Y;
    }

    const boxes: Box[] = tables.map((t, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      return {
        table: t,
        x: MARGIN + c * (BOX_W + GAP_X),
        y: rowY[r],
        w: BOX_W,
        h: boxHeight(t),
      };
    });

    const byName = new Map(boxes.map((b) => [b.table.name, b]));
    const width = MARGIN * 2 + cols * BOX_W + (cols - 1) * GAP_X;
    const heightTotal = acc - GAP_Y + MARGIN;
    return { boxes, width, height: heightTotal, byName };
  }, [schema]);

  const downloadSvg = () => {
    if (!svgRef.current) return;
    const xml = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob(
      ['<?xml version="1.0" encoding="UTF-8"?>\n', xml],
      { type: "image/svg+xml" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schema.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (boxes.length === 0) {
    return (
      <div className="results-empty">
        No tables to diagram yet. Create a table or load a dataset.
      </div>
    );
  }

  return (
    <div className="er-wrap">
      <div className="er-toolbar">
        <span>{boxes.length} tables · {foreignKeys.length} relationships</span>
        <button className="link-btn" onClick={downloadSvg}>
          ⭳ Download SVG
        </button>
      </div>
      <div className="er-scroll">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ background: "#0d1117" }}
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#2f81f7" />
            </marker>
          </defs>

          {/* FK edges (drawn first, under the boxes) */}
          {foreignKeys.map((fk, i) => {
            const a = byName.get(fk.fromTable);
            const b = byName.get(fk.toTable);
            if (!a || !b) return null;
            const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
            const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
            const p1 = borderPoint(a, bc.x, bc.y);
            const p2 = borderPoint(b, ac.x, ac.y);
            return (
              <line
                key={i}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#2f81f7"
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
                opacity={0.8}
              />
            );
          })}

          {/* Table boxes */}
          {boxes.map((b) => {
            const fkCols = new Set(
              foreignKeys
                .filter((f) => f.fromTable === b.table.name)
                .map((f) => f.fromColumn)
            );
            return (
              <g key={b.table.name}>
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx={8}
                  fill="#161b22"
                  stroke="#2d333b"
                  strokeWidth={1}
                />
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={HEADER_H}
                  rx={8}
                  fill="#1f6feb"
                />
                <rect
                  x={b.x}
                  y={b.y + HEADER_H - 8}
                  width={b.w}
                  height={8}
                  fill="#1f6feb"
                />
                <text
                  x={b.x + 10}
                  y={b.y + 20}
                  fill="#fff"
                  fontSize={13}
                  fontWeight={700}
                  fontFamily="monospace"
                >
                  {b.table.name}
                </text>
                {b.table.columns.map((col, ci) => {
                  const cy = b.y + HEADER_H + ci * ROW_H + 15;
                  const isFk = fkCols.has(col.name);
                  return (
                    <g key={col.name}>
                      <text
                        x={b.x + 10}
                        y={cy}
                        fill={col.pk ? "#f0c674" : "#e6edf3"}
                        fontSize={12}
                        fontFamily="monospace"
                      >
                        {col.pk ? "🔑 " : isFk ? "↪ " : ""}
                        {col.name}
                      </text>
                      <text
                        x={b.x + b.w - 10}
                        y={cy}
                        fill="#8b949e"
                        fontSize={11}
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {col.type}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
