const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ProjectIO=require('../src/core/project-io');
const EditorState=require('../src/app/editor-state');

const file=path.join(__dirname,'..','examples','reference-construction.json');

test('legacy_reference_loads_routes_numbers_and_saves_as_canonical_v3',()=>{
  const legacy=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(legacy.version,1);
  const parsed=ProjectIO.parse(JSON.stringify(legacy));
  assert.equal(parsed.ok,true,parsed.error);assert.equal(parsed.project.version,3);assert.equal(parsed.project.hexagons.length,8);
  const state=EditorState.create();const loaded=state.dispatch({type:'LOAD_PROJECT',project:legacy});assert.equal(loaded.ok,true,loaded.message);
  const snap=state.snapshot();
  assert.equal(snap.cells.length,8);assert.ok(snap.solution);assert.equal(snap.solution.vertexTrail[0],snap.routing.startId);assert.equal(snap.solution.vertexTrail.at(-1),snap.routing.endId);
  assert.equal(new Set(snap.solution.traversals.map(t=>t.edgeId)).size,snap.graph.edges.length);
  assert.equal(Object.keys(snap.numbering.edgeNumberById).length,snap.graph.edges.length);assert.equal(Object.keys(snap.numbering.hexNumberByKey).length,8);
  assert.equal(snap.strip.edgeCorrectionMm,0);assert.equal(snap.strip.edgeMm,snap.strip.baseEdgeMm);
  const saved=JSON.parse(ProjectIO.serialize(snap));assert.equal(saved.version,3);assert.equal(saved.strip.segments_per_edge,6);assert.equal(saved.strip.edge_correction_mm,0);assert.equal(saved.project.name,'');
});

test('reference_route_remains_continuous_after_v3_migration',()=>{
  const state=EditorState.create();state.dispatch({type:'LOAD_PROJECT',project:JSON.parse(fs.readFileSync(file,'utf8'))});const trail=state.snapshot().solution;
  for(let i=1;i<trail.traversals.length;i++)assert.equal(trail.traversals[i-1].to,trail.traversals[i].from);
});
