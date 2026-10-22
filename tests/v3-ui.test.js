const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const V3UI=require('../src/app/v3-ui');
const ROOT=path.join(__dirname,'..');

test('v3_ui_declares_project_target_edge_numbering_and_pdf_controls',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  for(const id of ['project-name','required-width-mm','required-height-mm','segments-per-edge','base-edge-mm','edge-correction-mm','edge-mm','show-hex-numbers','show-edge-numbers','show-route-numbers']) assert.ok(source.includes(`id="${id}"`),`missing ${id}`);
  assert.ok(source.includes("pdf.id='export-pdf-btn'")||source.includes('id="export-pdf-btn"'),'missing export-pdf-btn');
  for(const text of ['Наименование проекта','Требуемая ширина, мм','Требуемая высота, мм','Сегментов на ребро','Базовая длина ребра, мм','Коррекция длины ребра, мм','Итоговая длина ребра, мм','№ шестигранников','№ рёбер']) assert.ok(source.includes(text),`missing ${text}`);
  assert.match(source,/Избегать общих рёбер/);
});

test('scene_rect_fits_requires_twenty_pixel_margin',()=>{
  const viewport={left:100,top:50,right:1100,bottom:750};
  assert.equal(V3UI.rectFitsViewport({left:120,top:70,right:1080,bottom:730},viewport,20),true);
  assert.equal(V3UI.rectFitsViewport({left:119,top:70,right:1080,bottom:730},viewport,20),false);
  assert.equal(V3UI.rectFitsViewport({left:120,top:70,right:1081,bottom:730},viewport,20),false);
});

test('v3_ui_hides_legacy_strip_number_and_svg_controls_without_removing_runtime_hooks',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  for(const id of ['segments-per-side','side-mm','show-numbers','show-route-numbers','export-svg-btn']) assert.ok(source.includes(id));
  assert.match(source,/style\.display='none'/);
});

test('add_face_click_schedules_conditional_fit_but_delete_does_not',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  assert.match(source,/data-add-face/);
  assert.match(source,/fit-btn/);
  assert.match(source,/requestAnimationFrame|setTimeout/);
  assert.doesNotMatch(source,/data-cell-key[^\n]{0,120}fit-btn/);
});
