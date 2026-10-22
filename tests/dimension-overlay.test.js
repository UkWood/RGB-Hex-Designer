const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const GeometryBuilder=require('../src/core/geometry-builder');
const DimensionOverlay=require('../src/app/dimension-overlay');

const ROOT=path.join(__dirname,'..');
function snapshot(cells,edgeMm=100,orientation='pointy',requiredWidthMm=null,requiredHeightMm=null){return {graph:GeometryBuilder.build(cells),strip:{edgeMm,sideMm:edgeMm},orientation,requiredWidthMm,requiredHeightMm};}

test('dimension_geometry_uses_corrected_edge_and_rebuilds_for_orientation',()=>{
  const pointy=DimensionOverlay.dimensionGeometry(snapshot([{q:0,r:0}],105,'pointy'));
  assert.ok(Math.abs(pointy.mm.width-Math.sqrt(3)*105)<1e-9);
  assert.ok(Math.abs(pointy.mm.height-210)<1e-9);
  assert.ok(Math.abs(pointy.scene.width-Math.sqrt(3)*60)<1e-9);
  const flat=DimensionOverlay.dimensionGeometry(snapshot([{q:0,r:0}],105,'flat'));
  assert.ok(Math.abs(flat.mm.width-210)<1e-9);
  assert.ok(Math.abs(flat.mm.height-Math.sqrt(3)*105)<1e-9);
});

test('target_frame_is_centered_on_actual_frame_and_scaled_from_required_mm',()=>{
  const g=DimensionOverlay.dimensionGeometry(snapshot([{q:0,r:0},{q:1,r:0}],100,'pointy',500,300));
  assert.ok(g.target,'target frame required');
  const acx=(g.scene.minX+g.scene.maxX)/2,acy=(g.scene.minY+g.scene.maxY)/2;
  const tcx=(g.target.scene.minX+g.target.scene.maxX)/2,tcy=(g.target.scene.minY+g.target.scene.maxY)/2;
  assert.ok(Math.abs(acx-tcx)<1e-9);assert.ok(Math.abs(acy-tcy)<1e-9);
  assert.ok(Math.abs(g.target.scene.width-500*60/100)<1e-9);
  assert.ok(Math.abs(g.target.scene.height-300*60/100)<1e-9);
  assert.equal(g.target.mm.width,500);assert.equal(g.target.mm.height,300);
});

test('partial_target_dimensions_do_not_render_target_frame',()=>{
  assert.equal(DimensionOverlay.dimensionGeometry(snapshot([{q:0,r:0}],100,'pointy',500,null)).target,null);
  assert.equal(DimensionOverlay.dimensionGeometry(snapshot([{q:0,r:0}],100,'pointy',null,300)).target,null);
});

test('dimension_overlay_defines_actual_and_red_target_frames_with_four_horizontal_labels_each',()=>{
  const markup=DimensionOverlay.dimensionMarkup(snapshot([{q:0,r:0}],100,'pointy',500,300));
  assert.match(markup,/id="dimension-frame-layer"/);
  assert.match(markup,/data-frame="actual"/);
  assert.match(markup,/data-frame="target"/);
  assert.match(markup,/stroke="#dc2626"|stroke="var\(--required-frame\)"/);
  assert.match(markup,/fill="none"/);
  for(const side of ['width-top','width-bottom','height-left','height-right']){
    assert.match(markup,new RegExp(`data-dimension="actual-${side}"`));
    assert.match(markup,new RegExp(`data-dimension="target-${side}"`));
  }
  assert.doesNotMatch(markup,/rotate\(/);
});

test('dimension_overlay_does_not_replace_existing_layer_for_unrelated_svg_mutations',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/dimension-overlay.js'),'utf8');
  assert.doesNotMatch(source,/force\s*\|\|\s*true/,'unconditional replacement creates a MutationObserver ping-pong with edge numbering');
  assert.match(source,/if\s*\(existing\s*&&\s*!force\)\s*return/,'existing dimension layer must remain untouched unless refresh is explicitly forced');
});

test('dimension_overlay_removes_first_module_hint_from_workspace',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/dimension-overlay.js'),'utf8');
  assert.match(source,/querySelector\('\.canvas-help'\)/);assert.match(source,/\.remove\(\)/);
});

test('standalone_build_includes_dimension_overlay_before_main_boot',()=>{
  const source=fs.readFileSync(path.join(ROOT,'scripts/build.js'),'utf8');
  const overlay=source.indexOf("'src/app/dimension-overlay.js'");const main=source.indexOf("'src/app/main.js'");
  assert.ok(overlay>=0);assert.ok(main>overlay);
});
