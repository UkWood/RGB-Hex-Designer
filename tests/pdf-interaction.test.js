const test=require('node:test');
const assert=require('node:assert/strict');
const EditorState=require('../src/app/editor-state');
const V3UI=require('../src/app/v3-ui');

function routed(){const s=EditorState.create();s.dispatch({type:'ADD_HEX',q:0,r:0});return s.snapshot();}

test('open_print_document_writes_printable_html_and_invokes_print',async()=>{
  let written='',printed=0,focused=0;
  const child={document:{readyState:'complete',open(){},write(v){written=v;},close(){}},focus(){focused++;},print(){printed++;},addEventListener(){}};
  const fake={open(){return child;},setTimeout(fn){fn();}};
  const result=V3UI.openPrintDocument(routed(),fake);
  assert.deepEqual(result,{ok:true});
  assert.match(written,/<!doctype html>/i);assert.match(written,/Спецификация рёбер/);
  assert.equal(printed,1);assert.equal(focused,1);
});

test('open_print_document_reports_blocked_popup_and_unrouteable_project_without_throwing',()=>{
  const blocked={open(){return null;},setTimeout(fn){fn();}};
  assert.deepEqual(V3UI.openPrintDocument(routed(),blocked),{ok:false,reason:'popup_blocked'});
  const empty=EditorState.create().snapshot();
  assert.deepEqual(V3UI.openPrintDocument(empty,blocked),{ok:false,reason:'no_route'});
});
