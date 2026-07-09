import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql, SQLite, type SQLNamespace } from "@codemirror/lang-sql";
import type { TableInfo } from "../engine/db";

interface Props {
  value: string;
  onChange: (value: string) => void;
  schema: TableInfo[];
  onRun: () => void;
  onSelectionChange?: (selectedText: string) => void;
}

export function SqlEditor({
  value,
  onChange,
  schema,
  onRun,
  onSelectionChange,
}: Props) {
  // Feed the live schema into CodeMirror so table/column autocomplete works.
  const schemaMap = useMemo<SQLNamespace>(() => {
    const map: Record<string, string[]> = {};
    for (const table of schema) {
      map[table.name] = table.columns.map((c) => c.name);
    }
    return map;
  }, [schema]);

  const extensions = useMemo(
    () => [
      sql({ dialect: SQLite, schema: schemaMap, upperCaseKeywords: true }),
    ],
    [schemaMap]
  );

  return (
    <div
      className="editor"
      onKeyDown={(e) => {
        // Ctrl/Cmd + Enter runs the script, like most SQL consoles.
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          onRun();
        }
      }}
    >
      <CodeMirror
        value={value}
        height="100%"
        theme="dark"
        extensions={extensions}
        onChange={onChange}
        onUpdate={(vu) => {
          if (!onSelectionChange) return;
          const { from, to } = vu.state.selection.main;
          onSelectionChange(from === to ? "" : vu.state.sliceDoc(from, to));
        }}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
        }}
      />
    </div>
  );
}
