const test=require('node:test');
const assert=require('node:assert/strict');
const EditorState=require('../src/app/editor-state');

function add(s,q,r){const r0=s.dispatch({type:'ADD_HEX',q,r});assert.equal(r0.ok,true,r0.message);}

test('editor_snapshot_contains_complete_dynamic_numbering_after_route_recompute',()=>{
  const s=EditorState.create();add(s,0,0);add(s,1,0);add(s,1,1);
  let snap=s.snapshot();
  assert.ok(snap.numbering);
  assert.equal(Object.keys(snap.numbering.edgeNumberById).length,snap.graph.edges.length);
  assert.equal(Object.keys(snap.numbering.hexNumberByKey).length,snap.cells.length);
  assert.equal(snap.numbering.specRows.length,snap.graph.edges.length);
  const before=JSON.stringify(snap.numbering);
  assert.equal(s.dispatch({type:'SET_ORIENTATION',orientation:'flat'}).ok,true);
  snap=s.snapshot();
  assert.ok(snap.numbering);
  assert.equal(Object.keys(snap.numbering.edgeNumberById).length,snap.graph.edges.length);
  assert.notEqual(JSON.stringify(snap.numbering),before,'orientation/route recompute should derive numbering anew');
});
