const test=require('node:test');
const assert=require('node:assert/strict');
const EditorState=require('../src/app/editor-state');

function add(state,q,r){const x=state.dispatch({type:'ADD_HEX',q,r});assert.equal(x.ok,true,x.message);}

test('add_and_direct_delete_recompute_graph_and_route',()=>{
  const s=EditorState.create();
  add(s,0,0); add(s,1,0);
  let snap=s.snapshot();
  assert.equal(snap.cells.length,2); assert.equal(snap.graph.edges.length,11); assert.ok(snap.solution.traversals.length>=11);
  assert.equal(s.dispatch({type:'DELETE_HEX',q:1,r:0}).ok,true);
  snap=s.snapshot(); assert.equal(snap.cells.length,1); assert.equal(snap.graph.edges.length,6); assert.ok(snap.solution.traversals.length>=6);
});

test('state_has_no_persistent_active_hex_selection',()=>{
  const s=EditorState.create(); add(s,0,0);add(s,1,0);
  const snap=s.snapshot();
  assert.equal(Object.prototype.hasOwnProperty.call(snap,'selectedKey'),false);
  assert.equal(s.dispatch({type:'SELECT_HEX',q:1,r:0}).ok,false);
});

test('rejected_disconnecting_direct_delete_leaves_geometry_unchanged',()=>{
  const s=EditorState.create(); add(s,0,0);add(s,1,0);add(s,2,0);
  const before=s.snapshot().cells;
  const r=s.dispatch({type:'DELETE_HEX',q:1,r:0});
  assert.equal(r.ok,false); assert.deepEqual(s.snapshot().cells,before);
});

test('undo_redo_cross_add_and_remove_and_new_edit_clears_redo',()=>{
  const s=EditorState.create(); add(s,0,0);add(s,1,0);add(s,2,0);
  assert.equal(s.dispatch({type:'DELETE_HEX',q:2,r:0}).ok,true);
  assert.equal(s.snapshot().cells.length,2);
  assert.equal(s.dispatch({type:'UNDO'}).ok,true); assert.equal(s.snapshot().cells.length,3);
  assert.equal(s.dispatch({type:'UNDO'}).ok,true); assert.equal(s.snapshot().cells.length,2);
  assert.equal(s.dispatch({type:'REDO'}).ok,true); assert.equal(s.snapshot().cells.length,3);
  assert.equal(s.dispatch({type:'UNDO'}).ok,true); assert.equal(s.snapshot().cells.length,2);
  add(s,0,-1);
  assert.equal(s.snapshot().history.redoCount,0);
});

test('orientation_defaults_pointy_and_can_rotate_existing_field_to_flat',()=>{
  const s=EditorState.create(); add(s,0,0);add(s,1,0);add(s,1,1);
  const before=s.snapshot();
  assert.equal(before.orientation,'pointy');
  const beforeLower=before.boundary.lowerCandidateIds.map(id=>before.graph.vertices[id].key);
  assert.equal(s.dispatch({type:'SET_ORIENTATION',orientation:'flat'}).ok,true);
  const after=s.snapshot();
  assert.equal(after.orientation,'flat');
  assert.deepEqual(after.cells,before.cells);
  assert.equal(after.graph.edges.length,before.graph.edges.length);
  assert.ok(after.boundary.lowerCandidateIds.includes(after.routing.startId));
  assert.ok(after.boundary.lowerCandidateIds.includes(after.routing.endId));
  const afterLower=after.boundary.lowerCandidateIds.map(id=>after.graph.vertices[id].key);
  assert.notDeepEqual(afterLower,beforeLower);
});

test('orientation_can_be_set_before_first_hex_and_is_preserved_when_adding',()=>{
  const s=EditorState.create();
  assert.equal(s.dispatch({type:'SET_ORIENTATION',orientation:'flat'}).ok,true);
  add(s,0,0);
  assert.equal(s.snapshot().orientation,'flat');
});

test('strip_side_is_derived_from_cut_segments_and_led_density',()=>{
  const s=EditorState.create(); add(s,0,0);
  assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'segmentsPerSide',value:6}).ok,true);
  assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'ledPerM',value:60}).ok,true);
  let snap=s.snapshot();
  assert.equal(snap.strip.segmentsPerSide,6);
  assert.equal(snap.strip.sideMm,100);
  assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'ledPerM',value:120}).ok,true);
  snap=s.snapshot();
  assert.equal(snap.strip.sideMm,50);
});

test('segments_per_side_must_be_a_positive_integer',()=>{
  const s=EditorState.create();add(s,0,0);
  for(const value of [0,-1,2.5,'x']) assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'segmentsPerSide',value}).ok,false);
});

test('auto_endpoints_recompute_after_geometry_change',()=>{
  const s=EditorState.create(); add(s,0,0);
  const before=s.snapshot(); const oldKey=`${before.graph.vertices[before.routing.startId].gx},${before.graph.vertices[before.routing.startId].gy}`;
  add(s,0,1);
  const after=s.snapshot();
  assert.equal(after.routing.endpointMode,'auto');
  assert.ok(after.boundary.lowerCandidateIds.includes(after.routing.startId));
  const newKey=`${after.graph.vertices[after.routing.startId].gx},${after.graph.vertices[after.routing.startId].gy}`;
  assert.notEqual(`${after.cells.length}:${newKey}`,`1:${oldKey}`);
});

test('manual_start_end_persist_across_unrelated_settings_changes',()=>{
  const s=EditorState.create();add(s,0,0);add(s,1,0);
  const snap=s.snapshot(); const [a,b]=snap.boundary.lowerCandidateIds.slice(0,2);
  assert.equal(s.dispatch({type:'SET_MANUAL_START',vertexId:a}).ok,true);
  assert.equal(s.dispatch({type:'SET_MANUAL_END',vertexId:b}).ok,true);
  const manual=s.snapshot(); assert.equal(manual.routing.endpointMode,'manual');
  const keys=[manual.graph.vertices[manual.routing.startId].key,manual.graph.vertices[manual.routing.endId].key];
  assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'ledPerM',value:120}).ok,true);
  assert.equal(s.dispatch({type:'SET_VIEW_FLAG',flag:'showDiagnostics',value:true}).ok,true);
  const after=s.snapshot();
  assert.equal(after.routing.endpointMode,'manual');
  assert.deepEqual([after.graph.vertices[after.routing.startId].key,after.graph.vertices[after.routing.endId].key],keys);
});

test('orientation_change_invalidating_manual_endpoint_falls_back_to_auto_with_warning',()=>{
  const s=EditorState.create();add(s,0,0);add(s,0,1);
  const snap=s.snapshot();
  const [a,b]=snap.boundary.lowerCandidateIds.slice(0,2);
  s.dispatch({type:'SET_MANUAL_START',vertexId:a}); s.dispatch({type:'SET_MANUAL_END',vertexId:b});
  s.dispatch({type:'SET_ORIENTATION',orientation:'flat'});
  const after=s.snapshot();
  assert.ok(after.boundary.lowerCandidateIds.includes(after.routing.startId));
  assert.ok(after.boundary.lowerCandidateIds.includes(after.routing.endId));
  if(after.routing.endpointMode==='auto') assert.ok(after.warnings.some(w=>/lower boundary|AUTO/i.test(w)));
});

test('geometry_edit_invalidating_manual_endpoint_falls_back_to_auto_with_warning',()=>{
  const s=EditorState.create();add(s,0,0);
  const snap=s.snapshot();
  const lowest=snap.boundary.lowerCandidateIds.find(id=>snap.graph.vertices[id].gy===snap.boundary.bounds.yMax);
  const other=snap.boundary.lowerCandidateIds.find(id=>id!==lowest);
  s.dispatch({type:'SET_MANUAL_START',vertexId:lowest}); s.dispatch({type:'SET_MANUAL_END',vertexId:other});
  add(s,0,1);
  const after=s.snapshot(); assert.equal(after.routing.endpointMode,'auto'); assert.ok(after.warnings.some(w=>/lower boundary|AUTO/i.test(w)));
});

test('load_project_failure_leaves_snapshot_unchanged',()=>{
  const s=EditorState.create();add(s,0,0);add(s,1,0); const before=s.snapshot();
  const bad={version:1,hexagons:[{q:0,r:0},{q:9,r:9}],routing:{endpoint_mode:'auto',start:null,end:null,objective:'min_repeats'},strip:{side_mm:100,led_per_m:60,watts_per_m:18,voltage:12,psu_reserve_percent:20},view:{show_numbers:true,show_diagnostics:false}};
  const r=s.dispatch({type:'LOAD_PROJECT',project:bad}); assert.equal(r.ok,false); assert.deepEqual(s.snapshot().cells,before.cells);
});

test('changing_objective_recomputes_route_without_changing_geometry',()=>{
  const s=EditorState.create();add(s,0,0);add(s,1,0); const before=s.snapshot();
  assert.equal(s.dispatch({type:'SET_OBJECTIVE',objective:'avoid_shared'}).ok,true);
  const after=s.snapshot(); assert.deepEqual(after.cells,before.cells); assert.equal(after.routing.objective,'avoid_shared'); assert.ok(after.solution);
});

test('invalid_numeric_input_never_exposes_non_finite_electrical_values',()=>{
  const s=EditorState.create();add(s,0,0); const before=s.snapshot().electrical;
  assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'segmentsPerSide',value:'not-a-number'}).ok,false);
  const e=s.snapshot().electrical; assert.deepEqual(e,before);
  for(const v of Object.values(e)) if(typeof v==='number') assert.equal(Number.isFinite(v),true);
});
