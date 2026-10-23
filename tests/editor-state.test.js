const test=require('node:test');
const assert=require('node:assert/strict');
const EditorState=require('../src/app/editor-state');

function add(state,q,r){const x=state.dispatch({type:'ADD_HEX',q,r});assert.equal(x.ok,true,x.message);}

test('new_project_shows_edge_numbers_by_default',()=>{
  const snap=EditorState.create().snapshot();
  assert.equal(snap.view.showEdgeNumbers,true);
});

test('add_and_direct_delete_recompute_graph_and_route',()=>{
  const s=EditorState.create();add(s,0,0);add(s,1,0);let snap=s.snapshot();
  assert.equal(snap.cells.length,2);assert.equal(snap.graph.edges.length,11);assert.ok(snap.solution.traversals.length>=11);
  assert.equal(s.dispatch({type:'DELETE_HEX',q:1,r:0}).ok,true);snap=s.snapshot();assert.equal(snap.cells.length,1);assert.equal(snap.graph.edges.length,6);
});
test('state_has_no_persistent_active_hex_selection',()=>{const s=EditorState.create();add(s,0,0);add(s,1,0);assert.equal(Object.prototype.hasOwnProperty.call(s.snapshot(),'selectedKey'),false);assert.equal(s.dispatch({type:'SELECT_HEX',q:1,r:0}).ok,false);});
test('rejected_disconnecting_direct_delete_leaves_geometry_unchanged',()=>{const s=EditorState.create();add(s,0,0);add(s,1,0);add(s,2,0);const before=s.snapshot().cells;assert.equal(s.dispatch({type:'DELETE_HEX',q:1,r:0}).ok,false);assert.deepEqual(s.snapshot().cells,before);});
test('undo_redo_cross_add_and_remove_and_new_edit_clears_redo',()=>{const s=EditorState.create();add(s,0,0);add(s,1,0);add(s,2,0);assert.equal(s.dispatch({type:'DELETE_HEX',q:2,r:0}).ok,true);assert.equal(s.dispatch({type:'UNDO'}).ok,true);assert.equal(s.dispatch({type:'UNDO'}).ok,true);assert.equal(s.dispatch({type:'REDO'}).ok,true);assert.equal(s.dispatch({type:'UNDO'}).ok,true);add(s,0,-1);assert.equal(s.snapshot().history.redoCount,0);});
test('orientation_defaults_pointy_and_can_rotate_existing_field_to_flat',()=>{const s=EditorState.create();add(s,0,0);add(s,1,0);add(s,1,1);const before=s.snapshot();assert.equal(before.orientation,'pointy');assert.equal(s.dispatch({type:'SET_ORIENTATION',orientation:'flat'}).ok,true);const after=s.snapshot();assert.equal(after.orientation,'flat');assert.deepEqual(after.cells,before.cells);assert.ok(after.boundary.lowerCandidateIds.includes(after.routing.startId));assert.ok(after.boundary.lowerCandidateIds.includes(after.routing.endId));});
test('orientation_can_be_set_before_first_hex_and_is_preserved_when_adding',()=>{const s=EditorState.create();assert.equal(s.dispatch({type:'SET_ORIENTATION',orientation:'flat'}).ok,true);add(s,0,0);assert.equal(s.snapshot().orientation,'flat');});
test('legacy_strip_aliases_remain_derived_from_segments_and_density',()=>{const s=EditorState.create();add(s,0,0);assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'segmentsPerSide',value:6}).ok,true);assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'ledPerM',value:120}).ok,true);const snap=s.snapshot();assert.equal(snap.strip.segmentsPerSide,6);assert.equal(snap.strip.sideMm,50);});
test('auto_endpoints_recompute_after_geometry_change',()=>{const s=EditorState.create();add(s,0,0);add(s,0,1);const after=s.snapshot();assert.equal(after.routing.endpointMode,'auto');assert.ok(after.boundary.lowerCandidateIds.includes(after.routing.startId));});
test('manual_start_end_persist_across_unrelated_settings_changes',()=>{const s=EditorState.create();add(s,0,0);add(s,1,0);const [a,b]=s.snapshot().boundary.lowerCandidateIds.slice(0,2);assert.equal(s.dispatch({type:'SET_MANUAL_START',vertexId:a}).ok,true);assert.equal(s.dispatch({type:'SET_MANUAL_END',vertexId:b}).ok,true);assert.equal(s.dispatch({type:'SET_VIEW_FLAG',flag:'showDiagnostics',value:true}).ok,true);assert.equal(s.snapshot().routing.endpointMode,'manual');});
test('load_project_failure_leaves_snapshot_unchanged',()=>{const s=EditorState.create();add(s,0,0);const before=s.snapshot().cells;const bad={version:1,hexagons:[{q:0,r:0},{q:9,r:9}],routing:{endpoint_mode:'auto',start:null,end:null,objective:'min_repeats'},strip:{side_mm:100,led_per_m:60,watts_per_m:18,voltage:12,psu_reserve_percent:20},view:{show_numbers:true,show_diagnostics:false}};assert.equal(s.dispatch({type:'LOAD_PROJECT',project:bad}).ok,false);assert.deepEqual(s.snapshot().cells,before);});
test('changing_objective_recomputes_route_without_changing_geometry',()=>{const s=EditorState.create();add(s,0,0);add(s,1,0);const before=s.snapshot().cells;assert.equal(s.dispatch({type:'SET_OBJECTIVE',objective:'avoid_shared'}).ok,true);assert.deepEqual(s.snapshot().cells,before);});
test('invalid_numeric_input_never_exposes_non_finite_electrical_values',()=>{const s=EditorState.create();add(s,0,0);const before=s.snapshot().electrical;assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'segmentsPerEdge',value:'not-a-number'}).ok,false);assert.deepEqual(s.snapshot().electrical,before);});

test('project_name_required_dimensions_and_new_view_flags_live_in_snapshot',()=>{
  const s=EditorState.create();
  assert.equal(s.dispatch({type:'SET_PROJECT_NAME',value:'Стенд RGB'}).ok,true);
  assert.equal(s.dispatch({type:'SET_REQUIRED_DIMENSION',field:'width',value:1200}).ok,true);
  assert.equal(s.dispatch({type:'SET_REQUIRED_DIMENSION',field:'height',value:null}).ok,true);
  assert.equal(s.dispatch({type:'SET_VIEW_FLAG',flag:'showEdgeNumbers',value:true}).ok,true);
  const snap=s.snapshot();
  assert.equal(snap.projectName,'Стенд RGB');
  assert.equal(snap.requiredWidthMm,1200);assert.equal(snap.requiredHeightMm,null);
  assert.equal(snap.view.showHexNumbers,true);assert.equal(snap.view.showEdgeNumbers,true);assert.equal(snap.view.showRouteNumbers,false);
});

test('edge_correction_changes_corrected_edge_geometry_and_electrical_lengths_transactionally',()=>{
  const s=EditorState.create();add(s,0,0);
  assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'segmentsPerEdge',value:6}).ok,true);
  assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'ledPerM',value:60}).ok,true);
  assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'edgeCorrectionMm',value:5}).ok,true);
  let snap=s.snapshot();
  assert.equal(snap.strip.baseEdgeMm,100);assert.equal(snap.strip.edgeCorrectionMm,5);assert.equal(snap.strip.edgeMm,105);
  assert.equal(snap.strip.sideMm,105);assert.equal(snap.strip.segmentsPerSide,6);
  assert.equal(snap.electrical.edgeMm,105);assert.equal(snap.electrical.uniqueLengthM,snap.graph.edges.length*0.105);
  const before=snapshotComparable(snap);
  assert.equal(s.dispatch({type:'SET_STRIP_INPUT',field:'edgeCorrectionMm',value:-100}).ok,false);
  assert.deepEqual(snapshotComparable(s.snapshot()),before);
});
function snapshotComparable(snap){return {strip:snap.strip,electrical:snap.electrical,cells:snap.cells};}

test('required_dimensions_reject_nonpositive_values_without_corrupting_previous_value',()=>{
  const s=EditorState.create();assert.equal(s.dispatch({type:'SET_REQUIRED_DIMENSION',field:'width',value:800}).ok,true);
  assert.equal(s.dispatch({type:'SET_REQUIRED_DIMENSION',field:'width',value:0}).ok,false);assert.equal(s.snapshot().requiredWidthMm,800);
  assert.equal(s.dispatch({type:'SET_REQUIRED_DIMENSION',field:'height',value:''}).ok,true);assert.equal(s.snapshot().requiredHeightMm,null);
});

test('loading_v3_populates_metadata_targets_edge_inputs_and_view_flags',()=>{
  const s=EditorState.create();
  const p={version:3,project:{name:'Загрузка'},hexagons:[{q:0,r:0}],layout:{orientation:'flat',required_width_mm:900,required_height_mm:700},routing:{endpoint_mode:'auto',start:null,end:null,objective:'min_repeats'},strip:{segments_per_edge:6,led_per_m:60,edge_correction_mm:5,watts_per_m:18,voltage:12,psu_reserve_percent:20},view:{show_hex_numbers:false,show_edge_numbers:true,show_route_numbers:true,show_diagnostics:true}};
  assert.equal(s.dispatch({type:'LOAD_PROJECT',project:p}).ok,true);const snap=s.snapshot();
  assert.equal(snap.projectName,'Загрузка');assert.equal(snap.requiredWidthMm,900);assert.equal(snap.requiredHeightMm,700);
  assert.equal(snap.orientation,'flat');assert.equal(snap.strip.edgeMm,105);
  assert.equal(snap.view.showHexNumbers,false);assert.equal(snap.view.showEdgeNumbers,true);assert.equal(snap.view.showRouteNumbers,true);assert.equal(snap.view.showDiagnostics,true);
});
