const fs=require('node:fs');
const path=require('node:path');
const file=path.join(__dirname,'..','index.html');
if(!fs.existsSync(file))throw new Error('index.html not found; run npm run build');
const html=fs.readFileSync(file,'utf8');
const checks=[
  [/https?:\/\//i,'external URL'],
  [/<script\s+[^>]*src\s*=/i,'external script src'],
  [/<link\s+[^>]*rel=["']?stylesheet/i,'external stylesheet'],
  [/\bimport\s*\(/,'dynamic import'],
  [/__INLINE_(?:STYLES|SCRIPTS)__/,'unresolved build placeholder'],
  [/\bfetch\s*\(/,'network fetch'],
  [/\bXMLHttpRequest\b/,'XMLHttpRequest'],
  [/\bWebSocket\b/,'WebSocket']
];
for(const [re,label] of checks)if(re.test(html))throw new Error(`Standalone verification failed: ${label} found`);
for(const id of ['hex-canvas','undo-btn','redo-btn','delete-btn','clear-btn','fit-btn','orientation-toggle','auto-endpoints-btn','save-json-btn','load-json-input','route-prev-btn','route-next-btn','route-slider','route-animate-btn','route-pause-btn','project-name','required-width-mm','required-height-mm','segments-per-edge','base-edge-mm','edge-correction-mm','edge-mm','show-hex-numbers','show-edge-numbers']){
  if(!html.includes(`id="${id}"`))throw new Error(`Standalone verification failed: missing v3 control ${id}`);
}
for(const token of ['show-route-numbers','export-pdf-btn','PrintDocument','DiagramRenderer','DisplayNumbering'])if(!html.includes(token))throw new Error(`Standalone verification failed: missing ${token}`);
if(html.includes('/* src/core/svg-exporter.js */'))throw new Error('Standalone verification failed: legacy SVG exporter is still bundled');
if(!html.includes('Hex Router Designer'))throw new Error('Standalone verification failed: product title missing');
if(!/id="base-edge-mm"[^>]*readonly/.test(html)||!/id="edge-mm"[^>]*readonly/.test(html))throw new Error('Standalone verification failed: derived edge-length controls must be read-only');
console.log(`Standalone verification OK: ${path.basename(file)} is self-contained, PDF-only, and has all v3 controls.`);
