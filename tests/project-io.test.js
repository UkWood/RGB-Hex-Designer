const test=require('node:test');
const assert=require('node:assert/strict');
const ProjectIO=require('../src/core/project-io');
const GeometryBuilder=require('../src/core/geometry-builder');
const BoundaryAnalyzer=require('../src/core/boundary-analyzer');

function project(overrides={}){
  return {
    version:1,
    hexagons:[{q:0,r:0},{q:1,r:0}],
    routing:{endpoint_mode:'auto',start:null,end:null,objective:'min_repeats'},
    strip:{side_mm:100,led_per_m:60,watts_per_m:18,voltage:12,psu_reserve_percent:20},
    view:{show_numbers:true,show_diagnostics:false},
    ...overrides
  };
}

test('version_1_geometry_and_settings_round_trip_deterministically',()=>{
  const snapshot={
    cells:[{q:1,r:0},{q:0,r:0}],
    routing:{endpointMode:'auto',objective:'avoid_shared',startId:null,endId:null},
    strip:{sideMm:125,ledPerM:144,wattsPerM:20,voltage:24,reservePercent:30},
    view:{showNumbers:false,showDiagnostics:true}
  };
  const text=ProjectIO.serialize(snapshot);
  const parsed=ProjectIO.parse(text);
  assert.equal(parsed.ok,true);
  assert.deepEqual(parsed.project.hexagons,[{q:0,r:0},{q:1,r:0}]);
  assert.equal(parsed.project.routing.objective,'avoid_shared');
  assert.equal(parsed.project.strip.side_mm,125);
  assert.equal(parsed.project.view.show_diagnostics,true);
});

test('duplicate_axial_cells_are_rejected',()=>{
  const p=project({hexagons:[{q:0,r:0},{q:0,r:0}]});
  const r=ProjectIO.parse(JSON.stringify(p));
  assert.equal(r.ok,false); assert.match(r.error,/duplicate/i);
});

test('disconnected_cells_are_rejected',()=>{
  const p=project({hexagons:[{q:0,r:0},{q:4,r:4}]});
  const r=ProjectIO.parse(JSON.stringify(p));
  assert.equal(r.ok,false); assert.match(r.error,/connected/i);
});

test('malformed_and_unsupported_versions_are_rejected',()=>{
  assert.equal(ProjectIO.parse('{oops').ok,false);
  const r=ProjectIO.parse(JSON.stringify({...project(),version:2}));
  assert.equal(r.ok,false); assert.match(r.error,/version 2/i);
});

test('valid_manual_descriptors_resolve_after_graph_rebuild',()=>{
  const cells=[{q:0,r:0},{q:1,r:0}];
  const g=GeometryBuilder.build(cells); const b=BoundaryAnalyzer.analyze(g);
  const [s,e]=b.lowerCandidateIds.slice(0,2);
  const p=project({hexagons:cells,routing:{endpoint_mode:'manual',start:{gx:g.vertices[s].gx,gy:g.vertices[s].gy},end:{gx:g.vertices[e].gx,gy:g.vertices[e].gy},objective:'min_repeats'}});
  const r=ProjectIO.resolveManualEndpoints(p,g,b);
  assert.deepEqual(r,{mode:'manual',startId:s,endId:e,warnings:[]});
});

test('stale_or_upper_manual_endpoint_falls_back_to_auto_with_warning',()=>{
  const cells=[{q:0,r:0},{q:0,r:1}];
  const g=GeometryBuilder.build(cells); const b=BoundaryAnalyzer.analyze(g);
  const low=b.lowerCandidateIds[0];
  const upper=b.externalVertexIds.find(id=>!b.lowerCandidateIds.includes(id));
  const p=project({hexagons:cells,routing:{endpoint_mode:'manual',start:{gx:g.vertices[upper].gx,gy:g.vertices[upper].gy},end:{gx:g.vertices[low].gx,gy:g.vertices[low].gy},objective:'min_repeats'}});
  const r=ProjectIO.resolveManualEndpoints(p,g,b);
  assert.equal(r.mode,'auto'); assert.equal(r.startId,null); assert.equal(r.endId,null); assert.ok(r.warnings.length);
});

test('failed_parse_does_not_mutate_existing_fixture_object',()=>{
  const existing=project(); const before=JSON.stringify(existing);
  const r=ProjectIO.parse('{broken');
  assert.equal(r.ok,false); assert.equal(JSON.stringify(existing),before);
});


test('serialize_preserves_partial_manual_override_without_freezing_auto_counterpart',()=>{
  const cells=[{q:0,r:0},{q:1,r:0}];
  const graph=GeometryBuilder.build(cells); const b=BoundaryAnalyzer.analyze(graph);
  const [startId,endId]=b.lowerCandidateIds.slice(0,2);
  const manualStart={gx:graph.vertices[startId].gx,gy:graph.vertices[startId].gy};
  const snapshot={cells,graph,routing:{endpointMode:'manual',objective:'min_repeats',startId,endId,manualStart,manualEnd:null},strip:{sideMm:100,ledPerM:60,wattsPerM:18,voltage:12,reservePercent:20},view:{showNumbers:true,showDiagnostics:false}};
  const saved=JSON.parse(ProjectIO.serialize(snapshot));
  assert.deepEqual(saved.routing.start,manualStart);
  assert.equal(saved.routing.end,null);
});
