// Renders the self-contained backend console page (no build step, no client
// dependencies). It talks to the middleware's JSON API with relative URLs, so
// it works under any mount path. Inner script uses string concatenation only
// (no template literals) to stay safe inside this template literal.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderAdminPage(cfg: {
  title: string;
  readOnly: boolean;
}): string {
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
<header><b>${escapeHtml(cfg.title)}</b>${
    cfg.readOnly ? '<span class="ro">read-only</span>' : ""
  }<span style="color:var(--dim);font-size:12px">server-side SQLite</span></header>
<div class="wrap">
  <aside><div class="t">Schema</div><ul id="schema"></ul></aside>
  <main>
    <div class="ed"><textarea id="sql" spellcheck="false" placeholder="Write SQL, then press Ctrl/Cmd+Enter…">SELECT name FROM sqlite_master WHERE type='table';</textarea></div>
    <div class="bar"><button id="run">Run</button><span class="hint">Ctrl/Cmd+Enter</span><span class="hint" id="status"></span></div>
    <div class="out" id="out"></div>
  </main>
</div>
<script>
var CFG = ${config};
var API = location.pathname.replace(/\\/?$/, '/');
function esc(s){s=(s==null?'':String(s));return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
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
    if(o.error){h+='<div class="err">✗ '+esc(o.error)+'</div>';}
    else if(o.columns){
      h+='<div class="meta">'+o.rows.length+' row'+(o.rows.length===1?'':'s')+(o.truncated?' (truncated)':'')+' · '+o.elapsedMs.toFixed(1)+' ms</div><div class="sc"><table><thead><tr><th>#</th>';
      for(var c=0;c<o.columns.length;c++)h+='<th>'+esc(o.columns[c])+'</th>';
      h+='</tr></thead><tbody>';
      for(var r=0;r<o.rows.length;r++){
        h+='<tr><td style="color:var(--dim)">'+(r+1)+'</td>';
        for(var k=0;k<o.rows[r].length;k++){var v=o.rows[r][k];h+='<td'+cellClass(v)+'>'+esc(v==null?'NULL':v)+'</td>';}
        h+='</tr>';
      }
      h+='</tbody></table></div>';
    } else {
      h+='<div class="meta ok">✓ OK · '+o.rowsModified+' row'+(o.rowsModified===1?'':'s')+' affected · '+o.elapsedMs.toFixed(1)+' ms</div>';
    }
    h+='</div>';
  }
  el('out').innerHTML=h||'<div style="color:var(--dim);padding:16px">No output.</div>';
}
function run(){
  var sql=el('sql').value;
  el('status').textContent='Running…';
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
