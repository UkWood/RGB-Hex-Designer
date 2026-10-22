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
function projectV3(overrides={}){
  return {
    version:3,
    project:{name:'Тестовый проект'},
    hexagons:[{q:0,r:0},{q:1,r:0}],
    layout:{orientation:'flat',required_width_mm:1000,required_height_mm:null},
    routing:{endpoint_mode:'auto',start:null,end:null,objective:'min_repeats'},
    strip:{segments_per_edge:6,led_per_m:60,edge_correction_mm:5,watts_per_m:18,voltage:12,psu_reserve_percent:20},
    view:{show_hex_numbers:true,show_edge_numbers:false,show_route_numbers:true,show_diagnostics:false},
    ...overrides
  };
}

test('version_3_round_trip_preserves_project_target_edge_and_view_inputs',()=>{
  const snapshot={
    projectName:'Проект А',requiredWidthMm:1200,requiredHeightMm:null,cells:[{q:1,r:0},{q:0,r:0}],orientation:'flat',
    routing:{endpointMode:'auto',objective:'avoid_shared',startId:null,endId:null},
    strip:{segmentsPerEdge:9,baseEdgeMm:62.5,edgeCorrectionMm:-2.5,edgeMm:60,ledPerM:144,wattsPerM:20,voltage:24,reservePercent:30},
    view:{showHexNumbers:false,showEdgeNumbers:true,showRouteNumbers:true,showDiagnostics:true}
  };
  const parsed=ProjectIO.parse(ProjectIO.serialize(snapshot));
  assert.equal(parsed.ok,true);
  assert.equal(parsed.project.version,3);
  assert.equal(parsed.project.project.name,'Проект А');
  assert.deepEqual(parsed.project.hexagons,[{q:0,r:0},{q:1,r:0}]);
  assert.deepEqual(parsed.project.layout,{orientation:'flat',required_width_mm:1200,required_height_mm:null});
  assert.equal(parsed.project.routing.objective,'avoid_shared');
  assert.deepEqual(parsed.project.strip,{segments_per_edge:9,led_per_m:144,edge_correction_mm:-2.5,watts_per_m:20,voltage:24,psu_reserve_percent:30});
  assert.deepEqual(parsed.project.view,{show_hex_numbers:false,show_edge_numbers:true,show_route_numbers:true,show_diagnostics:true});
});

test('version_1_and_2_projects_migrate_to_canonical_v3_defaults',()=>{
  for(const legacy of [projectV1(),projectV2()]){
    const r=ProjectIO.parse(JSON.stringify(legacy));
    assert.equal(r.ok,true);
    assert.equal(r.project.version,3);
    assert.equal(r.project.project.name,'');
    assert.equal(r.project.layout.required_width_mm,null);
    assert.equal(r.project.layout.required_height_mm,null);
    assert.equal(r.project.strip.segments_per_edge,6);
    assert.equal(r.project.strip.edge_correction_mm,0);
    assert.equal(r.project.view.show_hex_numbers,true);
    assert.equal(r.project.view.show_edge_numbers,false);
    assert.equal(r.project.view.show_route_numbers,false);
  }
  assert.equal(ProjectIO.parse(JSON.stringify(projectV1())).project.layout.orientation,'pointy');
  assert.equal(ProjectIO.parse(JSON.stringify(projectV2())).project.layout.orientation,'flat');
});

test('version_1_non_integer_cut_count_is_rounded_with_warning',()=>{
  const p=projectV1();p.strip.side_mm=95;p.strip.led_per_m=60;
  const r=ProjectIO.parse(JSON.stringify(p));
  assert.equal(r.ok,true);
  assert.equal(r.project.strip.segments_per_edge,6);
  assert.ok(r.warnings.some(w=>/rounded|segment/i.test(w)));
});

test('partial_required_dimensions_are_valid_and_round_trip',()=>{
  let r=ProjectIO.parse(JSON.stringify(projectV3({layout:{orientation:'pointy',required_width_mm:900,required_height_mm:null}})));
  assert.equal(r.ok,true); assert.equal(r.project.layout.required_width_mm,900); assert.equal(r.project.layout.required_height_mm,null);
  r=ProjectIO.parse(JSON.stringify(projectV3({layout:{orientation:'pointy',required_width_mm:null,required_height_mm:700}})));
  assert.equal(r.ok,true); assert.equal(r.project.layout.required_width_mm,null); assert.equal(r.project.layout.required_height_mm,700);
});

test('invalid_v3_dimensions_segments_correction_and_view_flags_are_rejected',()=>{
  const cases=[
    projectV3({layout:{orientation:'pointy',required_width_mm:0,required_height_mm:null}}),
    projectV3({strip:{...projectV3().strip,segments_per_edge:2.5}}),
    projectV3({strip:{...projectV3().strip,edge_correction_mm:-100}}),
    projectV3({view:{...projectV3().view,show_edge_numbers:'yes'}})
  ];
  for(const p of cases) assert.equal(ProjectIO.parse(JSON.stringify(p)).ok,false);
});

test('duplicate_and_disconnected_axial_cells_are_rejected',()=>{
  let r=ProjectIO.parse(JSON.stringify(projectV3({hexagons:[{q:0,r:0},{q:0,r:0}]})));
  assert.equal(r.ok,false); assert.match(r.error,/duplicate/i);
  r=ProjectIO.parse(JSON.stringify(projectV3({hexagons:[{q:0,r:0},{q:4,r:4}]})));
  assert.equal(r.ok,false); assert.match(r.error,/connected/i);
});

test('malformed_and_unsupported_versions_are_rejected',()=>{
  assert.equal(ProjectIO.parse('{oops').ok,false);
  const r=ProjectIO.parse(JSON.stringify({...projectV3(),version:4}));
  assert.equal(r.ok,false); assert.match(r.error,/version 4/i);
});

test('valid_manual_descriptors_resolve_after_graph_rebuild_including_same_vertex',()=>{
  const cells=[{q:0,r:0},{q:1,r:0}];
  const g=GeometryBuilder.build(cells); const b=BoundaryAnalyzer.analyze(g,'flat');
  const [s,e]=b.lowerCandidateIds.slice(0,2);
  let p=projectV3({hexagons:cells,layout:{orientation:'flat',required_width_mm:null,required_height_mm:null},routing:{endpoint_mode:'manual',start:{gx:g.vertices[s].gx,gy:g.vertices[s].gy},end:{gx:g.vertices[e].gx,gy:g.vertices[e].gy},objective:'min_repeats'}});
  assert.deepEqual(ProjectIO.resolveManualEndpoints(p,g,b),{mode:'manual',startId:s,endId:e,warnings:[]});
  p={...p,routing:{...p.routing,end:{gx:g.vertices[s].gx,gy:g.vertices[s].gy}}};
  assert.deepEqual(ProjectIO.resolveManualEndpoints(p,g,b),{mode:'manual',startId:s,endId:s,warnings:[]});
});

test('stale_or_upper_manual_endpoint_falls_back_to_auto_with_warning',()=>{
  const cells=[{q:0,r:0},{q:0,r:1}];
  const g=GeometryBuilder.build(cells); const b=BoundaryAnalyzer.analyze(g,'pointy');
  const low=b.lowerCandidateIds[0]; const upper=b.externalVertexIds.find(id=>!b.lowerCandidateIds.includes(id));
  const p=projectV3({hexagons:cells,layout:{orientation:'pointy',required_width_mm:null,required_height_mm:null},routing:{endpoint_mode:'manual',start:{gx:g.vertices[upper].gx,gy:g.vertices[upper].gy},end:{gx:g.vertices[low].gx,gy:g.vertices[low].gy},objective:'min_repeats'}});
  const r=ProjectIO.resolveManualEndpoints(p,g,b);
  assert.equal(r.mode,'auto'); assert.equal(r.startId,null); assert.equal(r.endId,null); assert.ok(r.warnings.length);
});

test('failed_parse_does_not_mutate_existing_fixture_object',()=>{
  const existing=projectV3(); const before=JSON.stringify(existing);
  const r=ProjectIO.parse('{broken');
  assert.equal(r.ok,false); assert.equal(JSON.stringify(existing),before);
});

test('serialize_preserves_partial_and_equal_manual_descriptors',()=>{
  const cells=[{q:0,r:0},{q:1,r:0}];
  const graph=GeometryBuilder.build(cells); const b=BoundaryAnalyzer.analyze(graph,'pointy');
  const startId=b.lowerCandidateIds[0]; const manualStart={gx:graph.vertices[startId].gx,gy:graph.vertices[startId].gy};
  const base={projectName:'',requiredWidthMm:null,requiredHeightMm:null,cells,graph,orientation:'pointy',strip:{segmentsPerEdge:6,edgeCorrectionMm:0,ledPerM:60,wattsPerM:18,voltage:12,reservePercent:20},view:{showHexNumbers:true,showEdgeNumbers:false,showRouteNumbers:false,showDiagnostics:false}};
  let saved=JSON.parse(ProjectIO.serialize({...base,routing:{endpointMode:'manual',objective:'min_repeats',startId,manualStart,manualEnd:null}}));
  assert.deepEqual(saved.routing.start,manualStart); assert.equal(saved.routing.end,null);
  saved=JSON.parse(ProjectIO.serialize({...base,routing:{endpointMode:'manual',objective:'min_repeats',startId,endId:startId,manualStart,manualEnd:manualStart}}));
  assert.deepEqual(saved.routing.start,manualStart); assert.deepEqual(saved.routing.end,manualStart);
});
