const test=require('node:test');
const assert=require('node:assert/strict');
const EditorState=require('../src/app/editor-state');
const ProjectIO=require('../src/core/project-io');

function add(state,q,r){const r0=state.dispatch({type:'ADD_HEX',q,r});assert.equal(r0.ok,true,r0.message);}

test('manual_start_and_end_may_be_the_same_lower_vertex_and_form_closed_route',()=>{
  const state=EditorState.create();add(state,0,0);add(state,1,0);
  const first=state.snapshot();const id=first.boundary.lowerCandidateIds[0];
  assert.equal(state.dispatch({type:'SET_MANUAL_START',vertexId:id}).ok,true);
  assert.equal(state.dispatch({type:'SET_MANUAL_END',vertexId:id}).ok,true);
  const snap=state.snapshot();
  assert.equal(snap.routing.endpointMode,'manual');
  assert.equal(snap.routing.startId,id);assert.equal(snap.routing.endId,id);
  assert.equal(snap.solution.vertexTrail[0],id);assert.equal(snap.solution.vertexTrail.at(-1),id);
  assert.equal(snap.electrical.endpointSeparationM,0);
  const saved=JSON.parse(ProjectIO.serialize(snap));
  assert.deepEqual(saved.routing.start,saved.routing.end);
});

test('coincident_manual_endpoint_still_falls_back_to_auto_if_vertex_becomes_invalid',()=>{
  const state=EditorState.create();add(state,0,0);
  const snap=state.snapshot();
  const id=snap.boundary.lowerCandidateIds.find(v=>snap.graph.vertices[v].gy===snap.boundary.bounds.yMax)??snap.boundary.lowerCandidateIds[0];
  assert.equal(state.dispatch({type:'SET_MANUAL_START',vertexId:id}).ok,true);
  assert.equal(state.dispatch({type:'SET_MANUAL_END',vertexId:id}).ok,true);
  add(state,0,1);
  const after=state.snapshot();
  if(!after.boundary.lowerCandidateIds.includes(id)) assert.equal(after.routing.endpointMode,'auto');
});
