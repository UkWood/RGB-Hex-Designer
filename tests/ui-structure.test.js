const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const EditorUI=require('../src/app/editor-ui');
const HexGrid=require('../src/core/hex-grid');
const GeometryBuilder=require('../src/core/geometry-builder');

const ROOT=path.join(__dirname,'..');

test('editor_ui_declares_all_stable_control_ids',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  for(const id of ['hex-canvas','undo-btn','redo-btn','delete-btn','clear-btn','fit-btn','orientation-toggle','auto-endpoints-btn','save-json-btn','load-json-input','export-svg-btn','route-prev-btn','route-next-btn','route-slider','route-animate-btn','route-pause-btn','segments-per-side','side-mm']){
    assert.ok(source.includes(`id="${id}"`),`missing ${id}`);
  }
});

test('side_length_is_readonly_and_segments_are_primary_input',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  assert.match(source,/id="segments-per-side"[^>]*type="number"/);
  assert.match(source,/id="side-mm"[^>]*readonly/);
  assert.match(source,/Сегментов на сторону/);
});

test('orientation_switch_is_present_and_labels_are_rendered_in_upright_overlay',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  assert.match(source,/id="orientation-toggle"/);
  assert.match(source,/id="label-layer"/);
  assert.match(source,/placeLabel/);
});

test('responsive_styles_include_narrow_layout_and_touch_sized_controls',()=>{
  const css=fs.readFileSync(path.join(ROOT,'src/styles.css'),'utf8');
  assert.match(css,/@media\s*\(max-width:\s*760px\)/);
  assert.match(css,/min-height:\s*44px/);
});

test('template_contains_offline_build_placeholders_and_app_root',()=>{
  const html=fs.readFileSync(path.join(ROOT,'src/template.html'),'utf8');
  assert.match(html,/id="app"/);
  assert.match(html,/__INLINE_STYLES__/);
  assert.match(html,/__INLINE_SCRIPTS__/);
});

test('fit_transform_keeps_available_neighbor_targets_inside_canvas_in_both_orientations',()=>{
  const cells=[{q:0,r:0},{q:1,r:0}];
  const graph=GeometryBuilder.build(cells);
  for(const orientation of ['pointy','flat']){
    const fit=EditorUI.computeFitTransform({cells,graph,orientation},1000,700);
    const targets=HexGrid.create(cells).availableNeighbors();
    for(const cell of targets){
      const tg=GeometryBuilder.build([cell]);
      for(const v of tg.vertices){
        const p=GeometryBuilder.toWorld(v,60,orientation);
        const x=fit.tx+p.x*fit.scale, y=fit.ty+p.y*fit.scale;
        assert.ok(x>=40&&x<=960,`target x ${x} outside canvas in ${orientation}`);
        assert.ok(y>=40&&y<=660,`target y ${y} outside canvas in ${orientation}`);
      }
    }
  }
});

test('editor_uses_per_face_add_controls_instead_of_whole_neighbor_cells',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  assert.match(source,/\.freeFaces\(\)/);
  assert.match(source,/data-add-face=/);
  assert.match(source,/Добавить модуль на эту грань/);
});

test('hexes_are_not_persistently_selected_and_delete_is_a_temporary_mode',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  assert.doesNotMatch(source,/SELECT_HEX/);
  assert.doesNotMatch(source,/selectedKey/);
  assert.match(source,/deleteMode/);
  assert.match(source,/DELETE_HEX/);
});

test('route_arrowheads_are_half_size_and_add_face_controls_are_green',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  assert.match(source,/id="ui-arrow" markerWidth="3\.5" markerHeight="3\.5"/);
  assert.match(source,/class="add-face-hit"[^>]*fill="var\(--start\)"[^>]*stroke="var\(--start\)"/);
  assert.match(source,/class="add-face-plus"[^>]*fill="white"/);
});

test('animation_resumes_from_pause_and_restarts_only_after_end',()=>{
  assert.equal(EditorUI.animationStartStep(0,10),0);
  assert.equal(EditorUI.animationStartStep(4,10),4);
  assert.equal(EditorUI.animationStartStep(10,10),0);
  assert.deepEqual(EditorUI.animationTick(4,10),{step:5,done:false});
  assert.deepEqual(EditorUI.animationTick(9,10),{step:10,done:true});
});

test('label_placement_avoids_existing_rectangles',()=>{
  const occupied=[{x:5,y:5,w:70,h:24}];
  const placed=EditorUI.placeLabel(0,0,'START',occupied);
  const overlaps=occupied.some(r=>!(placed.x+placed.w<=r.x||r.x+r.w<=placed.x||placed.y+placed.h<=r.y||r.y+r.h<=placed.y));
  assert.equal(overlaps,false);
});
