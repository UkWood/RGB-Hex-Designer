const test=require('node:test');
const assert=require('node:assert/strict');
const GeometryBuilder=require('../src/core/geometry-builder');
const BoundaryAnalyzer=require('../src/core/boundary-analyzer');
const RouteOptimizer=require('../src/core/route-optimizer');
const EndpointSelector=require('../src/core/endpoint-selector');
const Electrical=require('../src/core/electrical-calculator');
const SvgExporter=require('../src/core/svg-exporter');

function fixture(showModuleNumbers=true,showRouteNumbers=true,sideMm=100){
  const cells=[{q:0,r:0},{q:1,r:0}];
  const graph=GeometryBuilder.build(cells);
  const boundary=BoundaryAnalyzer.analyze(graph);
  const ep=EndpointSelector.autoSelect(graph,boundary,RouteOptimizer.prepare(graph,'min_repeats'),sideMm);
  const electrical=Electrical.calculate({moduleCount:cells.length,uniqueEdgeCount:graph.edges.length,repeatCount:ep.solution.repeatCount,sideMm,ledPerM:60,wattsPerM:18,voltage:12,reservePercent:20,startVertex:graph.vertices[ep.startId],endVertex:graph.vertices[ep.endId]});
  return SvgExporter.export({graph,modules:graph.modules,solution:ep.solution,startId:ep.startId,endId:ep.endId,showModuleNumbers,showRouteNumbers,electrical,sideMm});
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
  assert.match(svg,/Total strip/);
  assert.match(svg,/LED approx/);
  assert.match(svg,/PSU/);
});

test('numbering_flags_control_module_and_route_labels',()=>{
  const on=fixture(true,true), off=fixture(false,false);
  assert.match(on,/class="module-number"/); assert.match(on,/class="route-number"/);
  assert.doesNotMatch(off,/class="module-number"/); assert.doesNotMatch(off,/class="route-number"/);
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
  assert.ok(ys.length>=8);
  assert.ok(Math.max(...ys)+14 <= bottom, `summary bottom ${Math.max(...ys)+14} exceeds viewBox ${bottom}`);
});


test('exported_route_arrowheads_are_half_the_previous_size',()=>{
  const svg=fixture();
  assert.match(svg,/id="dataArrow" markerWidth="4" markerHeight="4" refX="3\.5" refY="1\.5"/);
  assert.match(svg,/d="M0,0 L0,3 L4,1\.5 z"/);
});
