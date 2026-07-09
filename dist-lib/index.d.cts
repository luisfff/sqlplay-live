interface QueryResult {
    columns: string[];
    rows: unknown[][];
}
interface StatementOutcome {
    /** The SQL text of the statement that produced this outcome. */
    sql: string;
    /** Result set, if the statement returned rows. */
    result: QueryResult | null;
    /** Rows changed by INSERT/UPDATE/DELETE for this batch. */
    rowsModified: number;
    elapsedMs: number;
    error: string | null;
}
interface ColumnInfo {
    name: string;
    type: string;
    pk: boolean;
    notNull: boolean;
}
interface TableInfo {
    name: string;
    kind: "table" | "view";
    columns: ColumnInfo[];
    rowCount: number;
}
interface ForeignKey {
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
}
/**
 * A thin, UI-friendly wrapper around a single in-memory SQLite database.
 * This is the JS equivalent of an H2 in-memory database instance.
 */
declare class InMemoryDatabase {
    private db;
    private constructor();
    static create(): Promise<InMemoryDatabase>;
    /** Restore a database from previously exported bytes. */
    static open(bytes: Uint8Array): Promise<InMemoryDatabase>;
    /**
     * Run a script that may contain multiple statements. Each statement is
     * executed in order; the first error stops the batch (like most consoles).
     */
    run(script: string): StatementOutcome[];
    /** Introspect the current schema (tables, views, columns, row counts). */
    schema(): TableInfo[];
    /** All foreign-key relationships across the schema (for the ER diagram). */
    foreignKeys(): ForeignKey[];
    /** Run a single read query and return one result set (or null). */
    query(sql: string): QueryResult | null;
    /** Run a parameterized write statement (UPDATE/INSERT/DELETE). */
    mutate(sql: string, params?: unknown[]): void;
    /** Serialize the whole database to bytes (for export / persistence). */
    export(): Uint8Array;
    /** Drop everything and start fresh. */
    reset(): void;
}

/** Create a fresh in-memory SQLite database. */
declare function createDatabase(): Promise<InMemoryDatabase>;
/** Restore a database from bytes previously produced by `db.export()`. */
declare function openDatabase(bytes: Uint8Array): Promise<InMemoryDatabase>;

export { type ColumnInfo, type ForeignKey, InMemoryDatabase, type QueryResult, type StatementOutcome, type TableInfo, createDatabase, openDatabase };
