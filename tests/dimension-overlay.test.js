const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const GeometryBuilder=require('../src/core/geometry-builder');
const DimensionOverlay=require('../src/app/dimension-overlay');

const ROOT=path.join(__dirname,'..');

function snapshot(cells,sideMm=100,orientation='pointy'){
  return {graph:GeometryBuilder.build(cells),strip:{sideMm},orientation};
}

test('dimension_geometry_uses_only_hex_vertex_bounds_and_rebuilds_for_orientation',()=>{
  const pointy=DimensionOverlay.dimensionGeometry(snapshot([{q:0,r:0}],100,'pointy'));
  assert.ok(Math.abs(pointy.mm.width-Math.sqrt(3)*100)<1e-9);
  assert.ok(Math.abs(pointy.mm.height-200)<1e-9);
  assert.ok(Math.abs(pointy.scene.width-Math.sqrt(3)*60)<1e-9);
  assert.ok(Math.abs(pointy.scene.height-120)<1e-9);

  const flat=DimensionOverlay.dimensionGeometry(snapshot([{q:0,r:0}],100,'flat'));
  assert.ok(Math.abs(flat.mm.width-200)<1e-9);
  assert.ok(Math.abs(flat.mm.height-Math.sqrt(3)*100)<1e-9);
  assert.ok(Math.abs(flat.scene.width-120)<1e-9);
  assert.ok(Math.abs(flat.scene.height-Math.sqrt(3)*60)<1e-9);
});

test('dimension_overlay_defines_four_horizontal_dimension_labels_and_unfilled_frame',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/dimension-overlay.js'),'utf8');
  assert.match(source,/id="dimension-frame-layer"/);
  assert.match(source,/fill="none"/);
  assert.match(source,/vector-effect="non-scaling-stroke"/);
  assert.match(source,/data-dimension="width-top"/);
  assert.match(source,/data-dimension="width-bottom"/);
  assert.match(source,/data-dimension="height-left"/);
  assert.match(source,/data-dimension="height-right"/);
  assert.doesNotMatch(source,/rotate\(/);
});

test('dimension_overlay_removes_first_module_hint_from_workspace',()=>{
  const source=fs.readFileSync(path.join(ROOT,'src/app/dimension-overlay.js'),'utf8');
  assert.match(source,/querySelector\('\.canvas-help'\)/);
  assert.match(source,/\.remove\(\)/);
});

test('standalone_build_includes_dimension_overlay_before_main_boot',()=>{
  const source=fs.readFileSync(path.join(ROOT,'scripts/build.js'),'utf8');
  const overlay=source.indexOf("'src/app/dimension-overlay.js'");
  const main=source.indexOf("'src/app/main.js'");
  assert.ok(overlay>=0,'dimension overlay missing from build');
  assert.ok(main>overlay,'dimension overlay must load before main');
});
