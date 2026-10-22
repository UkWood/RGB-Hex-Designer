const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const template=fs.readFileSync(path.join(root,'src/template.html'),'utf8');
const styles=fs.readFileSync(path.join(root,'src/styles.css'),'utf8');
const sources=[
  'src/core/connectivity-validator.js',
  'src/core/hex-grid.js',
  'src/core/geometry-builder.js',
  'src/core/boundary-analyzer.js',
  'src/vendor/edmonds-blossom.js',
  'src/core/min-weight-perfect-matching.js',
  'src/core/route-optimizer.js',
  'src/core/endpoint-selector.js',
  'src/core/electrical-calculator.js',
  'src/core/project-io.js',
  'src/core/display-numbering.js',
  'src/core/diagram-renderer.js',
  'src/core/pdf-exporter.js',
  'src/app/editor-state.js',
  'src/app/editor-ui.js',
  'src/app/dimension-overlay.js',
  'src/app/v3-ui.js',
  'src/app/main.js'
];
const scripts=sources.map(file=>`\n/* ${file} */\n${fs.readFileSync(path.join(root,file),'utf8')}`).join('\n');
if(!template.includes('__INLINE_STYLES__')||!template.includes('__INLINE_SCRIPTS__'))throw new Error('build placeholders missing');
const html=template.replace('__INLINE_STYLES__',styles).replace('__INLINE_SCRIPTS__',scripts);
if(/__INLINE_(?:STYLES|SCRIPTS)__/.test(html))throw new Error('unresolved build placeholder');
const out=path.join(root,'index.html');
fs.writeFileSync(out,html,'utf8');
console.log(`Built ${out} (${Buffer.byteLength(html)} bytes)`);
