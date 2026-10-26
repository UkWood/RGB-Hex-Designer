const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const EditorUI=require('../src/app/editor-ui');
const HexGrid=require('../src/core/hex-grid');
const GeometryBuilder=require('../src/core/geometry-builder');

const ROOT=path.join(__dirname,'..');
const EPS=1e-9;

test('editor_ui_declares_all_stable_control_ids',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  for(const id of ['hex-canvas','undo-btn','redo-btn','delete-btn','clear-btn','fit-btn','orientation-toggle','auto-endpoints-btn','save-json-btn','load-json-input','export-svg-btn','route-prev-btn','route-next-btn','route-slider','route-animate-btn','route-pause-btn','show-full-route-btn','segments-per-side','side-mm','system-bounds']){
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

test('route_step_numbers_are_rendered_at_segment_midpoints',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  assert.match(source,/const x=\(a\.x\+b\.x\)\/2,y=\(a\.y\+b\.y\)\/2;labels\.push\(routeLabelMarkup\(x,y,String\(i\+1\)\)\)/);
});

test('system_bounds_are_shown_in_bottom_legend',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  assert.match(source,/id="system-bounds"/);
  assert.match(source,/GeometryBuilder\.worldBounds\(snap\.graph,snap\.strip\.sideMm,snap\.orientation\)/);
  assert.match(source,/Габариты:/);
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
        assert.ok(x>=20-EPS&&x<=980+EPS,`target x ${x} outside canvas in ${orientation}`);
        assert.ok(y>=20-EPS&&y<=680+EPS,`target y ${y} outside canvas in ${orientation}`);
      }
    }
  }
});

test('fit_bounds_transform_uses_at_least_twenty_pixel_margin_and_maximizes_scale',()=>{
  const fit=EditorUI.fitBoundsTransform({x:-100,y:-50,width:200,height:100},1000,700,20);
  const left=fit.tx-100*fit.scale,right=fit.tx+100*fit.scale;
  const top=fit.ty-50*fit.scale,bottom=fit.ty+50*fit.scale;
  assert.ok(left>=20-EPS&&right<=980+EPS);
  assert.ok(top>=20-EPS&&bottom<=680+EPS);
  assert.ok(Math.abs(left-20)<EPS||Math.abs(top-20)<EPS||Math.abs(right-980)<EPS||Math.abs(bottom-680)<EPS,'fit should use the available area, not leave excessive whitespace');
});

test('fit_button_and_orientation_refit_from_rendered_scene_bounds',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  assert.match(source,/getBBox\(\)/);
  assert.match(source,/data-pan-bg/);
  assert.match(source,/fitRenderedScene/);
  assert.match(source,/scheduleFitView/);
});

test('editor_uses_per_face_add_controls_instead_of_whole_neighbor_cells',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  assert.match(source,/\.freeFaces\(\)/);
  assert.match(source,/data-add-face=/);
  assert.match(source,/Добавить модуль на эту грань/);
});

test('endpoint_click_through_rule_does_not_disable_green_add_face_circles',()=>{
  const css=fs.readFileSync(path.join(ROOT,'src/styles.css'),'utf8');
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  assert.match(source,/class="add-face-hit"[^>]*fill="var\(--start\)"/);
  assert.match(css,/#scene\s*>\s*circle\[fill="var\(--start\)"\]/);
  assert.match(css,/#scene\s*>\s*circle\[fill="var\(--end\)"\]/);
  assert.doesNotMatch(css,/#scene\s+circle\[fill="var\(--start\)"\]/);
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
  assert.match(source,/class="add-face-hit"[^>]*r="16"[^>]*fill="var\(--start\)"[^>]*stroke="var\(--start\)"/);
  assert.match(source,/class="add-face-plus"[^>]*fill="white"/);
});

test('animation_resumes_from_pause_and_restarts_only_after_end',()=>{
  assert.equal(EditorUI.animationStartStep(0,10),0);
  assert.equal(EditorUI.animationStartStep(4,10),4);
  assert.equal(EditorUI.animationStartStep(10,10),0);
  assert.deepEqual(EditorUI.animationTick(4,10),{step:5,done:false});
  assert.deepEqual(EditorUI.animationTick(9,10),{step:10,done:true});
});

test('route_playback_uses_compact_icon_actions_with_accessible_labels',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  const css=fs.readFileSync(path.join(ROOT,'src/styles.css'),'utf8');
  const routeBlock=source.match(/<div class="route-controls">([\s\S]*?)<\/div>/)?.[1]||'';
  assert.match(routeBlock,/id="show-full-route-btn"/,'show-full-route must live with playback controls');
  for(const [id,icon,label] of [
    ['route-animate-btn','⏵','Анимация маршрута'],
    ['route-pause-btn','⏸','Пауза анимации'],
    ['show-full-route-btn','⏭','Показать весь маршрут']
  ]){
    assert.match(routeBlock,new RegExp(`id="${id}"[^>]*class="[^"]*route-icon-btn[^"]*"`),`${id} must be compact icon control`);
    assert.ok(routeBlock.includes(`aria-label="${label}"`),`missing aria-label for ${id}`);
    assert.ok(routeBlock.includes(`title="${label}"`),`missing title for ${id}`);
    assert.ok(routeBlock.includes(`>${icon}</button>`),`missing icon ${icon} for ${id}`);
  }
  assert.match(css,/\.route-icon-btn\s*\{/);
  assert.match(css,/\.route-icon-btn[^}]*width:\s*44px/);
});

test('label_placement_avoids_existing_rectangles',()=>{
  const occupied=[{x:5,y:5,w:70,h:24}];
  const placed=EditorUI.placeLabel(0,0,'START',occupied);
  const overlaps=occupied.some(r=>!(placed.x+placed.w<=r.x||r.x+r.w<=placed.x||placed.y+placed.h<=r.y||r.y+r.h<=placed.y));
  assert.equal(overlaps,false);
});

test('responsive_editor_uses_drawer_breakpoint_above_tablet_range',()=>{
  const css=fs.readFileSync(path.join(ROOT,'src/styles.css'),'utf8');
  assert.match(css,/@media\s*\(max-width:\s*1080px\)/);
  assert.match(css,/\.parameters-drawer/);
  assert.match(css,/\.parameters-toggle/);
  assert.match(css,/\.mobile-editor-nav/);
});

test('add_face_keeps_small_visual_circle_but_exposes_large_touch_hit_area',()=>{
  const editorSource=fs.readFileSync(path.join(ROOT,'src/app/editor-ui.js'),'utf8');
  const v3Source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  assert.match(editorSource,/class="add-face-hit"[^>]*r="16"/);
  assert.match(v3Source,/class="add-face-touch"[^>]*r="25"[^>]*fill="transparent"/);
});

test('editor_exposes_visible_temporary_mode_banner_hook',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/v3-ui.js'),'utf8');
  assert.match(source,/id='editor-mode-banner'|id="editor-mode-banner"|modeBanner\.id='editor-mode-banner'/);
  assert.match(source,/Режим:/);
});

test('gyvertwink_export_is_a_project_action_without_repeat_led_offset',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/gyvertwink-ui.js'),'utf8');
  const mainSource=fs.readFileSync(path.join(ROOT,'src/app/main.js'),'utf8');
  assert.match(source,/button\.id='export-gt-btn'/);
  assert.match(source,/button\.textContent='Экспорт для GyverTwink'/);
  assert.match(source,/save\.insertAdjacentElement\('afterend',button\)/);
  assert.match(source,/GyverTwinkExport\.build\(state\.snapshot\(\)\)/);
  assert.doesNotMatch(source,/repeatOffsetMm/);
  assert.doesNotMatch(source,/GYVERTWINK_REPEAT_OFFSET_MM/);
  assert.match(source,/gyvertwink-map\.json/);
  assert.match(source,/Сначала создайте трассируемую схему\./);
  assert.match(mainSource,/GyverTwinkUI\?root\.GyverTwinkUI\.install\(host,state\)/);
});