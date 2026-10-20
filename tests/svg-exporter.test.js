const test=require('node:test');
const assert=require('node:assert/strict');
const GeometryBuilder=require('../src/core/geometry-builder');
const BoundaryAnalyzer=require('../src/core/boundary-analyzer');
const RouteOptimizer=require('../src/core/route-optimizer');
const EndpointSelector=require('../src/core/endpoint-selector');
const Electrical=require('../src/core/electrical-calculator');
const SvgExporter=require('../src/core/svg-exporter');

function fixture(showModuleNumbers=true,showRouteNumbers=true,sideMm=100,orientation='pointy'){
  const cells=[{q:0,r:0},{q:1,r:0}];
  const graph=GeometryBuilder.build(cells);
  const boundary=BoundaryAnalyzer.analyze(graph,orientation);
  const ep=EndpointSelector.autoSelect(graph,boundary,RouteOptimizer.prepare(graph,'min_repeats'),sideMm,orientation);
  const strip={segmentsPerSide:6,ledPerM:60,sideMm,wattsPerM:18,voltage:12,reservePercent:20};
  const electrical=Electrical.calculate({moduleCount:cells.length,uniqueEdgeCount:graph.edges.length,repeatCount:ep.solution.repeatCount,sideMm,ledPerM:strip.ledPerM,wattsPerM:strip.wattsPerM,voltage:strip.voltage,reservePercent:strip.reservePercent,startVertex:graph.vertices[ep.startId],endVertex:graph.vertices[ep.endId]});
  return SvgExporter.export({graph,modules:graph.modules,solution:ep.solution,startId:ep.startId,endId:ep.endId,showModuleNumbers,showRouteNumbers,electrical,sideMm,orientation});
}

test('exports_standalone_svg_with_viewbox_modules_and_route',()=>{
  const svg=fixture();
  assert.match(svg,/^<svg\b/);
  assert.match(svg,/viewBox="[^"]+"/);
  assert.equal((svg.match(/data-module=/g)||[]).length,2);
  assert.ok((svg.match(/data-route=/g)||[]).length>0);
});

test('repeated_traversals_are_visually_distinguished',()=>{
  const svg=fixture();
  assert.match(svg,/class="route repeat"/);
  assert.match(svg,/stroke-dasharray/);
});

test('contains_start_end_data_direction_and_calculation_summary',()=>{
  const svg=fixture();
  assert.match(svg,/>START</);
  assert.match(svg,/>END</);
  assert.match(svg,/DATA/);
  assert.match(svg,/Итого ленты/);
  assert.match(svg,/LED ≈/);
  assert.match(svg,/БП ≥/);
});

test('numbering_flags_control_module_and_route_labels',()=>{
  const on=fixture(true,true), off=fixture(false,false);
  assert.match(on,/class="module-number"/); assert.match(on,/class="route-number"/);
  assert.doesNotMatch(off,/class="module-number"/); assert.doesNotMatch(off,/class="route-number"/);
});

test('module_numbers_are_sequential_and_not_axial_coordinate_keys',()=>{
  const svg=fixture(true,false);
  const labels=[...svg.matchAll(/<text class="module-number"[^>]*>([^<]+)<\/text>/g)].map(m=>m[1]);
  assert.deepEqual(labels,['1','2']);
  assert.doesNotMatch(svg,/<text class="module-number"[^>]*>0,0<\/text>/);
  assert.doesNotMatch(svg,/<text class="module-number"[^>]*>1,0<\/text>/);
});

test('exported_route_numbers_are_exactly_at_segment_midpoints',()=>{
  const svg=fixture(false,true,100);
  const line=svg.match(/<line class="route [^"]+" data-route="1" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/);
  const number=svg.match(/<text class="route-number" x="([^"]+)" y="([^"]+)"[^>]*>1<\/text>/);
  assert.ok(line&&number,'first route segment and number must exist');
  const [x1,y1,x2,y2]=line.slice(1).map(Number);
  const [x,y]=number.slice(1).map(Number);
  assert.ok(Math.abs(x-(x1+x2)/2)<0.02);
  assert.ok(Math.abs(y-(y1+y2)/2)<0.02);
});

test('svg_draws_pure_hex_dimension_frame_with_four_dimension_labels',()=>{
  for(const orientation of ['pointy','flat']){
    const svg=fixture(false,false,100,orientation);
    const graph=GeometryBuilder.build([{q:0,r:0},{q:1,r:0}]);
    const b=GeometryBuilder.worldBounds(graph,100,orientation);
    const rect=svg.match(/<rect class="dimension-frame" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/);
    assert.ok(rect,'dimension frame missing');
    const actual=rect.slice(1).map(Number);
    assert.ok(Math.abs(actual[0]-b.minX)<0.02);
    assert.ok(Math.abs(actual[1]-b.minY)<0.02);
    assert.ok(Math.abs(actual[2]-b.width)<0.02);
    assert.ok(Math.abs(actual[3]-b.height)<0.02);
    for(const side of ['width-top','width-bottom','height-left','height-right']) assert.match(svg,new RegExp(`data-dimension="${side}"`));
  }
});

test('svg_legend_contains_dimensions_strip_power_inputs_and_calculations',()=>{
  const svg=fixture();
  const graph=GeometryBuilder.build([{q:0,r:0},{q:1,r:0}]);
  const b=GeometryBuilder.worldBounds(graph,100,'pointy');
  assert.match(svg,new RegExp(`Габариты: ${Math.round(b.width*100)/100} × ${Math.round(b.height*100)/100} мм`));
  for(const text of ['Сегментов на сторону: 6','LED/м: 60','Сторона: 100 мм','Вт/м: 18','Напряжение: 12 В','Запас БП: 20%','Уникальная длина:','Повторы:','Итого ленты:','LED ≈:','Мощность:','Ток:','БП ≥:']) assert.ok(svg.includes(text),`missing legend item: ${text}`);
});

test('svg_has_no_external_urls_scripts_or_raster_images',()=>{
  const svg=fixture();
  assert.doesNotMatch(svg,/(?:href|src)="https?:\/\//i);
  assert.doesNotMatch(svg,/<script\b/i);
  assert.doesNotMatch(svg,/<image\b/i);
});


test('small_side_svg_keeps_all_summary_lines_inside_viewbox',()=>{
  const svg=fixture(true,true,10);
  const vb=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const bottom=vb[1]+vb[3];
  const ys=[...svg.matchAll(/<text class="summary"[^>]* y="([^"]+)"/g)].map(m=>Number(m[1]));
  assert.ok(ys.length>=15);
  assert.ok(Math.max(...ys)+14 <= bottom, `summary bottom ${Math.max(...ys)+14} exceeds viewBox ${bottom}`);
});


test('exported_route_arrowheads_are_half_the_previous_size',()=>{
  const svg=fixture();
  assert.match(svg,/id="dataArrow" markerWidth="4" markerHeight="4" refX="3\.5" refY="1\.5"/);
  assert.match(svg,/d="M0,0 L0,3 L4,1\.5 z"/);
});
