const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const V3UI=require('../src/app/v3-ui');
const ROOT=path.join(__dirname,'..');

test('v3_ui_declares_project_target_edge_numbering_and_pdf_controls',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  for(const id of ['project-name','required-width-mm','required-height-mm','segments-per-edge','base-edge-mm','edge-correction-mm','edge-mm','show-hex-numbers','show-edge-numbers']) assert.ok(source.includes(`id="${id}"`),`missing ${id}`);
  assert.ok(source.includes('show-route-numbers'),'missing reused show-route-numbers control');
  assert.ok(source.includes("pdf.id='export-pdf-btn'")||source.includes('id="export-pdf-btn"'),'missing export-pdf-btn');
  for(const text of ['Наименование проекта','Требуемая ширина, мм','Требуемая высота, мм','Сегментов на ребро','Базовая длина ребра, мм','Коррекция длины ребра, мм','Итоговая длина ребра, мм','№ шестигранников','№ рёбер','№ шагов маршрута']) assert.ok(source.includes(text),`missing ${text}`);
  assert.match(source,/Избегать общих рёбер/);
  assert.doesNotMatch(source,/<input id="show-route-numbers"/,'must reuse existing route checkbox rather than duplicate its id');
});

test('pdf_export_downloads_directly_without_opening_window_or_print_dialog',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  assert.match(source,/PdfExporter/);
  assert.match(source,/downloadPdf|download\(/);
  assert.doesNotMatch(source,/\bwindow\.open\b|\bw\.open\(|\.print\s*\(/);
});

test('assigned_start_and_end_markers_are_click_through_so_opposite_endpoint_can_use_same_vertex',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  assert.match(source,/circle\[fill="var\(--start\)"\]/);
  assert.match(source,/circle\[fill="var\(--end\)"\]/);
  assert.match(source,/pointer-events[^\n]{0,80}none|pointerEvents[^\n]{0,80}none/);
});

test('project_name_change_refreshes_legacy_editor_snapshot_before_save_json_click',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  assert.match(source,/\$\('project-name'\)[^\n]*addEventListener\('change'[^\n]*forceEditorRefresh/);
});

test('scene_rect_fits_requires_twenty_pixel_margin',()=>{
  const viewport={left:100,top:50,right:1100,bottom:750};
  assert.equal(V3UI.rectFitsViewport({left:120,top:70,right:1080,bottom:730},viewport,20),true);
  assert.equal(V3UI.rectFitsViewport({left:119,top:70,right:1080,bottom:730},viewport,20),false);
  assert.equal(V3UI.rectFitsViewport({left:120,top:70,right:1081,bottom:730},viewport,20),false);
});

test('v3_ui_hides_legacy_strip_hex_number_and_svg_controls',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  for(const id of ['segments-per-side','side-mm','show-numbers','export-svg-btn']) assert.ok(source.includes(id));
  assert.match(source,/style\.display='none'/);
});

test('add_face_click_schedules_conditional_fit_but_delete_does_not',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  assert.match(source,/data-add-face/);assert.match(source,/fit-btn/);assert.match(source,/requestAnimationFrame|setTimeout/);assert.doesNotMatch(source,/data-cell-key[^\n]{0,120}fit-btn/);
});