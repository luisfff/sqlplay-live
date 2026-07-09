#!/usr/bin/env node
// SQLPlay CLI — serves the built console and opens it in the browser,
// mirroring the H2 Console launch experience. Zero runtime dependencies.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
};

function parseArgs(argv) {
  const opts = { port: 4577, open: true, host: "127.0.0.1" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--port" || a === "-p") opts.port = Number(argv[++i]);
    else if (a === "--host") opts.host = argv[++i];
    else if (a === "--no-open") opts.open = false;
    else if (a === "--help" || a === "-h") opts.help = true;
  }
  return opts;
}

function openBrowser(url) {
  const cmd =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
      ? ["open", [url]]
      : ["xdg-open", [url]];
  try {
    spawn(cmd[0], cmd[1], { stdio: "ignore", detached: true }).unref();
  } catch {
    /* opening the browser is best-effort */
  }
}

async function serveFile(res, filePath) {
  const body = await readFile(filePath);
  const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    // Required so the browser can instantiate the SQLite WASM module.
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  res.end(body);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`SQLPlay — in-memory SQL console

Usage: sqlplay [options]

Options:
  -p, --port <n>   Port to listen on (default 4577)
      --host <h>   Host to bind (default 127.0.0.1)
      --no-open    Do not open the browser automatically
  -h, --help       Show this help`);
    return;
  }

  try {
    await stat(join(DIST, "index.html"));
  } catch {
    console.error(
      "✗ Built assets not found. If you cloned the repo, run `npm run build` first."
    );
    process.exit(1);
  }

  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      let rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
      if (rel === "/" || rel === "\\" || rel === "") rel = "index.html";
      let filePath = join(DIST, rel);

      // SPA fallback: unknown non-asset routes serve index.html.
      try {
        const s = await stat(filePath);
        if (s.isDirectory()) filePath = join(filePath, "index.html");
      } catch {
        filePath = join(DIST, "index.html");
      }
      await serveFile(res, filePath);
    } catch (err) {
      res.writeHead(500);
      res.end("Internal error: " + String(err));
    }
  });

  server.listen(opts.port, opts.host, () => {
    const url = `http://${opts.host}:${opts.port}/`;
    console.log(`\n  ▊ SQLPlay running at ${url}`);
    console.log(`  Press Ctrl+C to stop.\n`);
    if (opts.open) openBrowser(url);
  });
}

main();
