import {
  InMemoryDatabase,
  splitStatements
} from "./chunk-NL6X44PU.js";

// src/server/index.ts
import {
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  readdirSync
} from "fs";
import { join } from "path";

// src/server/page.ts
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function renderAdminPage(cfg) {
  const config = JSON.stringify({ readOnly: cfg.readOnly });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(cfg.title)}</title>
<style>
  :root{--bg:#0d1117;--elev:#161b22;--elev2:#1c232c;--bd:#2d333b;--tx:#e6edf3;--dim:#8b949e;--ac:#2f81f7;--ok:#3fb950;--dg:#f85149;--mono:ui-monospace,Menlo,Consolas,monospace}
  *{box-sizing:border-box}html,body{margin:0;height:100%}
  body{background:var(--bg);color:var(--tx);font-family:system-ui,Segoe UI,Roboto,sans-serif;font-size:14px;display:flex;flex-direction:column}
  header{display:flex;align-items:center;gap:10px;padding:8px 14px;background:var(--elev);border-bottom:1px solid var(--bd)}
  header b{font-size:15px}header .ro{font-size:11px;color:#d29922;border:1px solid rgba(210,153,34,.3);background:rgba(210,153,34,.12);border-radius:10px;padding:1px 8px}
  .wrap{flex:1;display:flex;min-height:0}
  aside{width:230px;background:var(--elev);border-right:1px solid var(--bd);overflow:auto;padding:8px 0}
  aside .t{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--dim);padding:4px 14px}
  aside ul{list-style:none;margin:0;padding:0}
  aside li{padding:4px 14px;font-family:var(--mono);font-size:12.5px;cursor:pointer;display:flex;justify-content:space-between}
  aside li:hover{background:var(--elev2);color:var(--ac)}
  aside .c{color:var(--dim);font-size:11px}
  main{flex:1;display:flex;flex-direction:column;min-width:0}
  .ed{flex:0 0 40%;display:flex;flex-direction:column}
  textarea{flex:1;background:var(--bg);color:var(--tx);border:none;outline:none;padding:12px;font-family:var(--mono);font-size:13.5px;resize:none}
  .bar{display:flex;gap:8px;align-items:center;padding:6px 10px;background:var(--elev);border-top:1px solid var(--bd);border-bottom:1px solid var(--bd)}
  button{background:var(--ac);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;font-weight:600}
  .bar .hint{color:var(--dim);font-size:12px;font-weight:400}
  .out{flex:1;overflow:auto;padding:8px}
  .blk{border:1px solid var(--bd);border-radius:8px;margin-bottom:14px;overflow:hidden}
  .blk .q{font-family:var(--mono);font-size:12px;color:var(--dim);background:var(--elev);padding:6px 10px;border-bottom:1px solid var(--bd);white-space:pre-wrap}
  .meta{font-size:12px;color:var(--dim);padding:6px 10px}.meta.ok{color:var(--ok)}
  .err{color:var(--dg);font-family:var(--mono);padding:10px}
  table{border-collapse:collapse;width:100%;font-family:var(--mono);font-size:13px}
  th,td{border-top:1px solid var(--bd);border-right:1px solid var(--bd);padding:5px 10px;text-align:left;white-space:nowrap}
  th{background:var(--elev2);position:sticky;top:0}
  .sc{overflow:auto}
</style>
</head>
<body>
<header><b>${escapeHtml(cfg.title)}</b>${cfg.readOnly ? '<span class="ro">read-only</span>' : ""}<span style="color:var(--dim);font-size:12px">server-side SQLite</span></header>
<div class="wrap">
  <aside><div class="t">Schema</div><ul id="schema"></ul></aside>
  <main>
    <div class="ed"><textarea id="sql" spellcheck="false" placeholder="Write SQL, then press Ctrl/Cmd+Enter\u2026">SELECT name FROM sqlite_master WHERE type='table';</textarea></div>
    <div class="bar"><button id="run">Run</button><span class="hint">Ctrl/Cmd+Enter</span><span class="hint" id="status"></span></div>
    <div class="out" id="out"></div>
  </main>
</div>
<script>
var CFG = ${config};
var API = location.pathname.replace(/\\/?$/, '/');
function esc(s){s=(s==null?'':String(s));return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function el(id){return document.getElementById(id);}
function loadSchema(){
  fetch(API+'api/schema').then(function(r){return r.json();}).then(function(d){
    var h='';var t=d.tables||[];
    for(var i=0;i<t.length;i++){
      h+='<li data-n="'+esc(t[i].name)+'"><span>'+esc(t[i].name)+'</span><span class="c">'+t[i].rowCount+'</span></li>';
    }
    if(!t.length)h='<li style="color:var(--dim);cursor:default">No tables yet</li>';
    el('schema').innerHTML=h;
    var lis=el('schema').querySelectorAll('li[data-n]');
    for(var j=0;j<lis.length;j++){lis[j].onclick=function(){insert('SELECT * FROM "'+this.getAttribute('data-n')+'" LIMIT 100;');};}
  });
}
function insert(s){var ta=el('sql');ta.value=(ta.value.trim()?ta.value+'\\n':'')+s;ta.focus();}
function cellClass(v){return v==null?' style="color:var(--dim);font-style:italic"':'';}
function render(outcomes){
  var h='';
  for(var i=0;i<outcomes.length;i++){
    var o=outcomes[i];
    h+='<div class="blk"><div class="q">'+esc(o.sql)+'</div>';
    if(o.error){h+='<div class="err">\u2717 '+esc(o.error)+'</div>';}
    else if(o.columns){
      h+='<div class="meta">'+o.rows.length+' row'+(o.rows.length===1?'':'s')+(o.truncated?' (truncated)':'')+' \xB7 '+o.elapsedMs.toFixed(1)+' ms</div><div class="sc"><table><thead><tr><th>#</th>';
      for(var c=0;c<o.columns.length;c++)h+='<th>'+esc(o.columns[c])+'</th>';
      h+='</tr></thead><tbody>';
      for(var r=0;r<o.rows.length;r++){
        h+='<tr><td style="color:var(--dim)">'+(r+1)+'</td>';
        for(var k=0;k<o.rows[r].length;k++){var v=o.rows[r][k];h+='<td'+cellClass(v)+'>'+esc(v==null?'NULL':v)+'</td>';}
        h+='</tr>';
      }
      h+='</tbody></table></div>';
    } else {
      h+='<div class="meta ok">\u2713 OK \xB7 '+o.rowsModified+' row'+(o.rowsModified===1?'':'s')+' affected \xB7 '+o.elapsedMs.toFixed(1)+' ms</div>';
    }
    h+='</div>';
  }
  el('out').innerHTML=h||'<div style="color:var(--dim);padding:16px">No output.</div>';
}
function run(){
  var sql=el('sql').value;
  el('status').textContent='Running\u2026';
  fetch(API+'api/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:sql})})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.error){el('out').innerHTML='<div class="err" style="padding:16px">'+esc(d.error)+'</div>';el('status').textContent='';return;}
      render(d.outcomes||[]);
      var e=(d.outcomes||[]).filter(function(o){return o.error;});
      el('status').textContent=e.length?'Error':'Done';
      loadSchema();
    })
    .catch(function(err){el('status').textContent='Request failed: '+err;});
}
el('run').onclick=run;
el('sql').addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run();}});
loadSchema();
</script>
</body>
</html>`;
}

// src/server/index.ts
function resolveInit(init) {
  const entries = Array.isArray(init) ? init : [init];
  const parts = [];
  for (const entry of entries) {
    if (existsSync(entry) && statSync(entry).isDirectory()) {
      const files = readdirSync(entry).filter((f) => f.toLowerCase().endsWith(".sql")).sort();
      for (const f of files) parts.push(readFileSync(join(entry, f), "utf8"));
    } else if (existsSync(entry) && statSync(entry).isFile()) {
      parts.push(readFileSync(entry, "utf8"));
    } else {
      parts.push(entry);
    }
  }
  return parts.join("\n;\n");
}
var WRITE_KW = /\b(insert|update|delete|drop|create|alter|replace|attach|detach|reindex|vacuum|truncate)\b/i;
function isReadOnlyStatement(stmt) {
  if (/^\s*(select|pragma|explain)\b/i.test(stmt)) return true;
  if (/^\s*with\b/i.test(stmt) && !WRITE_KW.test(stmt)) return true;
  return false;
}
function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(text);
}
function readBody(req) {
  if (req.body !== void 0) {
    return Promise.resolve(
      typeof req.body === "string" ? req.body : JSON.stringify(req.body)
    );
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => data += c);
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}
function cell(v) {
  if (v instanceof Uint8Array) return `\xABblob ${v.length}\xBB`;
  return v;
}
function sqlplay(options = {}) {
  const {
    database = ":memory:",
    init,
    resetOnStart = false,
    readOnly = false,
    maxRows = 1e3,
    title = "SQLPlay \u2014 Server Console"
  } = options;
  let dbPromise = null;
  const getDb = () => {
    if (!dbPromise) {
      dbPromise = (async () => {
        const fileExists = database !== ":memory:" && existsSync(database);
        if (fileExists && !resetOnStart) {
          return InMemoryDatabase.open(
            new Uint8Array(readFileSync(database))
          );
        }
        const db = await InMemoryDatabase.create();
        if (init) {
          const outcomes = db.run(resolveInit(init));
          const failed = outcomes.find((o) => o.error);
          if (failed) {
            throw new Error(
              `sqlplay init failed on: ${failed.sql.slice(0, 80)} \u2014 ${failed.error}`
            );
          }
        }
        if (database !== ":memory:") {
          try {
            writeFileSync(database, Buffer.from(db.export()));
          } catch {
          }
        }
        return db;
      })();
    }
    return dbPromise;
  };
  const persist = (db) => {
    if (database !== ":memory:") {
      try {
        writeFileSync(database, Buffer.from(db.export()));
      } catch {
      }
    }
  };
  return async function middleware(req, res, next) {
    const url = (req.url || "/").split("?")[0];
    const isApi = (suffix) => url === suffix || url.endsWith(suffix);
    try {
      if (req.method === "GET" && (url === "/" || url === "" || url === "/index.html")) {
        const html = renderAdminPage({ title, readOnly });
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }
      if (req.method === "GET" && isApi("/api/schema")) {
        const db = await getDb();
        json(res, 200, { tables: db.schema(), foreignKeys: db.foreignKeys() });
        return;
      }
      if (req.method === "POST" && isApi("/api/query")) {
        const raw = await readBody(req);
        let sql = "";
        try {
          sql = JSON.parse(raw || "{}").sql || "";
        } catch {
          json(res, 400, { error: "Invalid JSON body." });
          return;
        }
        if (readOnly && sql.trim()) {
          const offending = splitStatements(sql).find(
            (s) => !isReadOnlyStatement(s)
          );
          if (offending) {
            json(res, 403, {
              error: "This console is read-only; only SELECT/PRAGMA/EXPLAIN/WITH statements are allowed."
            });
            return;
          }
        }
        const db = await getDb();
        const outcomes = db.run(sql).map((o) => ({
          sql: o.sql,
          error: o.error,
          rowsModified: o.rowsModified,
          elapsedMs: o.elapsedMs,
          columns: o.result?.columns ?? null,
          rows: o.result ? o.result.rows.slice(0, maxRows).map((r) => r.map(cell)) : null,
          truncated: o.result ? o.result.rows.length > maxRows : false
        }));
        if (!readOnly && outcomes.some((o) => !o.error && o.rowsModified > 0)) {
          persist(db);
        }
        json(res, 200, { outcomes });
        return;
      }
      if (next) return next();
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    } catch (err) {
      json(res, 500, {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  };
}
var server_default = sqlplay;
export {
  server_default as default,
  sqlplay
};
