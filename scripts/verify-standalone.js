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
for(const id of ['hex-canvas','undo-btn','redo-btn','delete-btn','clear-btn','fit-btn','auto-endpoints-btn','save-json-btn','load-json-input','export-svg-btn','route-prev-btn','route-next-btn','route-slider','route-animate-btn','route-pause-btn']){
  if(!html.includes(`id="${id}"`))throw new Error(`Standalone verification failed: missing control ${id}`);
}
if(!html.includes('Hex Router Designer'))throw new Error('Standalone verification failed: product title missing');
console.log(`Standalone verification OK: ${path.basename(file)} is self-contained and has all required controls.`);
