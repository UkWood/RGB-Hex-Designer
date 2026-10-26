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
  const styles=fs.readFileSync(path.join(ROOT,'src/styles.css'),'utf8');
  assert.match(styles,/circle\[fill="var\(--start\)"\]/);
  assert.match(styles,/circle\[fill="var\(--end\)"\]/);
  assert.match(styles,/pointer-events\s*:\s*none/);
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

test('responsive_composition_declares_header_project_actions_grouped_sections_and_outputs',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  for(const token of ['editor-header','project-actions','ux-section--geometry','ux-section--display','base-edge-output','edge-output','output-row']) assert.ok(source.includes(token),`missing ${token}`);
});

test('endpoint_actions_are_reparented_into_persistent_editor_toolbar',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/main.js'),'utf8');
  assert.match(source,/endpoint-tools/);
  assert.match(source,/toolbar/);
  for(const [id,label] of [['auto-endpoints-btn','AUTO'],['pick-start-btn','START'],['pick-end-btn','END']]){
    assert.ok(source.includes(id),`missing ${id}`);
    assert.ok(source.includes(`'${label}'`)||source.includes(`"${label}"`),`missing compact label ${label}`);
  }
  assert.match(source,/endpointTools\.appendChild\(button\)/);
  assert.match(source,/fit-btn/);
});

test('phone_primary_tools_keep_fit_auto_start_end_in_one_four_column_row',()=>{
  const mainSource=fs.readFileSync(path.join(ROOT,'src/app/main.js'),'utf8');
  const styles=mainSource+'\n'+fs.readFileSync(path.join(ROOT,'src/styles.css'),'utf8');
  assert.match(mainSource,/phone-primary-tools/);
  for(const id of ['fit-btn','auto-endpoints-btn','pick-start-btn','pick-end-btn']) assert.ok(mainSource.includes(id),`missing ${id} in phone primary tool composition`);
  assert.match(styles,/@media\s*\(max-width:\s*760px\)[\s\S]*\.phone-primary-tools[\s\S]*grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(styles,/\.phone-primary-tools[^}]*white-space:\s*nowrap|\.phone-primary-tools[\s\S]*button[^}]*white-space:\s*nowrap/);
});

test('phone_project_actions_are_one_row_with_short_visible_labels',()=>{
  const mainSource=fs.readFileSync(path.join(ROOT,'src/app/main.js'),'utf8');
  const styles=mainSource+'\n'+fs.readFileSync(path.join(ROOT,'src/styles.css'),'utf8');
  for(const label of ['Сохранить','Открыть','GyverTwink','PDF']) assert.ok(mainSource.includes(`'${label}'`)||mainSource.includes(`"${label}"`),`missing phone label ${label}`);
  assert.match(mainSource,/data-phone-label/);
  assert.match(mainSource,/project-actions/);
  assert.match(styles,/@media\s*\(max-width:\s*760px\)[\s\S]*\.project-actions[\s\S]*grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(styles,/\.project-actions button,\.project-actions \.file-label\{[^}]*min-height:\s*44px/);
  assert.match(styles,/content:\s*attr\(data-phone-label\)/);
});

test('responsive_composition_declares_parameter_drawer_controls',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  for(const id of ['parameters-toggle','parameters-drawer','parameters-close']) assert.ok(source.includes(id),`missing ${id}`);
  assert.match(source,/Escape/);
});

test('optimization_is_exposed_as_segmented_control_while_legacy_select_is_retained',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  assert.ok(source.includes('id="objective-segmented"')||source.includes("segmented.id='objective-segmented'"),'missing segmented objective control id');
  assert.match(source,/data-objective="min_repeats"/);
  assert.match(source,/data-objective="avoid_shared"/);
  assert.match(source,/objective-select/);
});

test('appearance_control_supports_system_light_and_dark_preferences',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  assert.match(source,/id="appearance-select"/);
  for(const value of ['system','light','dark']) assert.ok(source.includes(`value="${value}"`),`missing appearance ${value}`);
  assert.match(source,/localStorage/);
  assert.match(source,/dataset\.theme|data-theme/);
});

test('appearance_defaults_to_dark_and_preserves_stored_preference',()=>{
  assert.equal(V3UI.resolveInitialTheme({getItem(){return null;}}),'dark');
  for(const stored of ['system','light','dark']){
    assert.equal(V3UI.resolveInitialTheme({getItem(){return stored;}}),stored);
  }
  assert.equal(V3UI.resolveInitialTheme({getItem(){throw new Error('storage blocked');}}),'dark');
});

test('app_entry_resynchronizes_parameter_drawer_accessibility_on_resize',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/main.js'),'utf8');
  assert.match(source,/addEventListener\('resize'/);
  assert.match(source,/parameters-drawer/);
  assert.match(source,/aria-hidden/);
  assert.match(source,/1080/);
});