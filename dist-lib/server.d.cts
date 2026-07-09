import { IncomingMessage, ServerResponse } from 'node:http';

interface SqlplayServerOptions {
    /** ":memory:" (default) or a path to a .sqlite file to load/persist. */
    database?: string;
    /**
     * Schema/seed SQL to build the database on startup. Each entry may be:
     *  - inline SQL,
     *  - a path to a `.sql` file, or
     *  - a directory (all `*.sql` files run in sorted filename order).
     * Runs when the database is fresh (in-memory, a new file, or resetOnStart).
     */
    init?: string | string[];
    /** For a file database, rebuild from `init` on every start (default false). */
    resetOnStart?: boolean;
    /** Reject anything that isn't a read (SELECT/PRAGMA/EXPLAIN/WITH). */
    readOnly?: boolean;
    /** Cap rows returned per result set (default 1000). */
    maxRows?: number;
    /** Title shown in the console header. */
    title?: string;
}
type Req = IncomingMessage & {
    url?: string;
    method?: string;
    body?: unknown;
};
type Res = ServerResponse;
type Next = (err?: unknown) => void;
declare function sqlplay(options?: SqlplayServerOptions): (req: Req, res: Res, next?: Next) => Promise<void>;

export { type SqlplayServerOptions, sqlplay as default, sqlplay };
