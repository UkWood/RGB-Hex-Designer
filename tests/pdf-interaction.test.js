const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const V3UI=require('../src/app/v3-ui');

const ROOT=path.join(__dirname,'..');

test('legacy_print_window_api_is_removed',()=>{
  assert.equal('openPrintDocument' in V3UI,false);
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  assert.doesNotMatch(source,/\bopenPrintDocument\b|\.print\s*\(|\bwindow\.open\b|\bw\.open\(/);
});

test('v3_ui_routes_export_button_to_pdf_exporter_download',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  assert.match(source,/PdfExporter\.downloadPdf/);
  assert.match(source,/export-pdf-btn/);
});
