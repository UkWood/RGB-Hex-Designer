const test=require('node:test');
const assert=require('node:assert/strict');
const ProjectIO=require('../src/core/project-io');
const GeometryBuilder=require('../src/core/geometry-builder');
const BoundaryAnalyzer=require('../src/core/boundary-analyzer');

function projectV1(overrides={}){
  return {
    version:1,
    hexagons:[{q:0,r:0},{q:1,r:0}],
    routing:{endpoint_mode:'auto',start:null,end:null,objective:'min_repeats'},
    strip:{side_mm:100,led_per_m:60,watts_per_m:18,voltage:12,psu_reserve_percent:20},
    view:{show_numbers:true,show_diagnostics:false},
    ...overrides
  };
}

function projectV2(overrides={}){
  return {
    version:2,
    hexagons:[{q:0,r:0},{q:1,r:0}],
    layout:{orientation:'flat'},
    routing:{endpoint_mode:'auto',start:null,end:null,objective:'min_repeats'},
    strip:{segments_per_side:6,led_per_m:60,watts_per_m:18,voltage:12,psu_reserve_percent:20},
    view:{show_numbers:true,show_diagnostics:false},
    ...overrides
  };
}

test('version_2_geometry_orientation_and_strip_settings_round_trip_deterministically',()=>{
  const snapshot={
    cells:[{q:1,r:0},{q:0,r:0}],
    orientation:'flat',
    routing:{endpointMode:'auto',objective:'avoid_shared',startId:null,endId:null},
    strip:{segmentsPerSide:9,sideMm:62.5,ledPerM:144,wattsPerM:20,voltage:24,reservePercent:30},
    view:{showNumbers:false,showDiagnostics:true}
  };
  const text=ProjectIO.serialize(snapshot);
  const parsed=ProjectIO.parse(text);
  assert.equal(parsed.ok,true);
  assert.equal(parsed.project.version,2);
  assert.deepEqual(parsed.project.hexagons,[{q:0,r:0},{q:1,r:0}]);
  assert.equal(parsed.project.layout.orientation,'flat');
  assert.equal(parsed.project.routing.objective,'avoid_shared');
  assert.equal(parsed.project.strip.segments_per_side,9);
  assert.equal(parsed.project.strip.led_per_m,144);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed.project.strip,'side_mm'),false);
  assert.equal(parsed.project.view.show_diagnostics,true);
});

test('version_1_projects_migrate_to_pointy_and_derive_integer_segments',()=>{
  const r=ProjectIO.parse(JSON.stringify(projectV1()));
  assert.equal(r.ok,true);
  assert.equal(r.project.version,2);
  assert.equal(r.project.layout.orientation,'pointy');
  assert.equal(r.project.strip.segments_per_side,6);
  assert.equal(r.project.strip.led_per_m,60);
});

test('version_1_non_integer_cut_count_is_rounded_with_warning',()=>{
  const p=projectV1();p.strip.side_mm=95;p.strip.led_per_m=60;
  const r=ProjectIO.parse(JSON.stringify(p));
  assert.equal(r.ok,true);
  assert.equal(r.project.strip.segments_per_side,6);
  assert.ok(r.warnings.some(w=>/rounded|segment/i.test(w)));
});

test('duplicate_axial_cells_are_rejected',()=>{
  const p=projectV2({hexagons:[{q:0,r:0},{q:0,r:0}]});
  const r=ProjectIO.parse(JSON.stringify(p));
  assert.equal(r.ok,false); assert.match(r.error,/duplicate/i);
});

test('disconnected_cells_are_rejected',()=>{
  const p=projectV2({hexagons:[{q:0,r:0},{q:4,r:4}]});
  const r=ProjectIO.parse(JSON.stringify(p));
  assert.equal(r.ok,false); assert.match(r.error,/connected/i);
});

test('malformed_and_unsupported_versions_are_rejected',()=>{
  assert.equal(ProjectIO.parse('{oops').ok,false);
  const r=ProjectIO.parse(JSON.stringify({...projectV2(),version:3}));
  assert.equal(r.ok,false); assert.match(r.error,/version 3/i);
});

test('invalid_orientation_and_non_integer_segments_are_rejected',()=>{
  let p=projectV2({layout:{orientation:'diagonal'}});
  let r=ProjectIO.parse(JSON.stringify(p));assert.equal(r.ok,false);assert.match(r.error,/orientation/i);
  p=projectV2();p.strip.segments_per_side=2.5;
  r=ProjectIO.parse(JSON.stringify(p));assert.equal(r.ok,false);assert.match(r.error,/segments/i);
});

test('valid_manual_descriptors_resolve_after_graph_rebuild',()=>{
  const cells=[{q:0,r:0},{q:1,r:0}];
  const g=GeometryBuilder.build(cells); const b=BoundaryAnalyzer.analyze(g,'flat');
  const [s,e]=b.lowerCandidateIds.slice(0,2);
  const p=projectV2({hexagons:cells,layout:{orientation:'flat'},routing:{endpoint_mode:'manual',start:{gx:g.vertices[s].gx,gy:g.vertices[s].gy},end:{gx:g.vertices[e].gx,gy:g.vertices[e].gy},objective:'min_repeats'}});
  const r=ProjectIO.resolveManualEndpoints(p,g,b);
  assert.deepEqual(r,{mode:'manual',startId:s,endId:e,warnings:[]});
});

test('stale_or_upper_manual_endpoint_falls_back_to_auto_with_warning',()=>{
  const cells=[{q:0,r:0},{q:0,r:1}];
  const g=GeometryBuilder.build(cells); const b=BoundaryAnalyzer.analyze(g,'pointy');
  const low=b.lowerCandidateIds[0];
  const upper=b.externalVertexIds.find(id=>!b.lowerCandidateIds.includes(id));
  const p=projectV2({hexagons:cells,layout:{orientation:'pointy'},routing:{endpoint_mode:'manual',start:{gx:g.vertices[upper].gx,gy:g.vertices[upper].gy},end:{gx:g.vertices[low].gx,gy:g.vertices[low].gy},objective:'min_repeats'}});
  const r=ProjectIO.resolveManualEndpoints(p,g,b);
  assert.equal(r.mode,'auto'); assert.equal(r.startId,null); assert.equal(r.endId,null); assert.ok(r.warnings.length);
});

test('failed_parse_does_not_mutate_existing_fixture_object',()=>{
  const existing=projectV2(); const before=JSON.stringify(existing);
  const r=ProjectIO.parse('{broken');
  assert.equal(r.ok,false); assert.equal(JSON.stringify(existing),before);
});

test('serialize_preserves_partial_manual_override_without_freezing_auto_counterpart',()=>{
  const cells=[{q:0,r:0},{q:1,r:0}];
  const graph=GeometryBuilder.build(cells); const b=BoundaryAnalyzer.analyze(graph,'pointy');
  const [startId,endId]=b.lowerCandidateIds.slice(0,2);
  const manualStart={gx:graph.vertices[startId].gx,gy:graph.vertices[startId].gy};
  const snapshot={cells,graph,orientation:'pointy',routing:{endpointMode:'manual',objective:'min_repeats',startId,endId,manualStart,manualEnd:null},strip:{segmentsPerSide:6,sideMm:100,ledPerM:60,wattsPerM:18,voltage:12,reservePercent:20},view:{showNumbers:true,showDiagnostics:false}};
  const saved=JSON.parse(ProjectIO.serialize(snapshot));
  assert.deepEqual(saved.routing.start,manualStart);
  assert.equal(saved.routing.end,null);
});
