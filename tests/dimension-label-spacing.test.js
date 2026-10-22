const test=require('node:test');
const assert=require('node:assert/strict');
const GeometryBuilder=require('../src/core/geometry-builder');
const DimensionOverlay=require('../src/app/dimension-overlay');
const EditorState=require('../src/app/editor-state');
const DiagramRenderer=require('../src/core/diagram-renderer');

function attr(markup,id,name){
  const m=String(markup).match(new RegExp(`data-dimension="${id}"[^>]*\\b${name}="([^"]+)"`));
  assert.ok(m,`missing ${name} for ${id}`);
  return Number(m[1]);
}

function workspaceSnapshot(){
  return {
    graph:GeometryBuilder.build([{q:0,r:0}]),
    strip:{edgeMm:100,sideMm:100},
    orientation:'pointy',
    requiredWidthMm:500,
    requiredHeightMm:300
  };
}

function pdfSnapshot(){
  const s=EditorState.create();
  s.dispatch({type:'ADD_HEX',q:0,r:0});
  s.dispatch({type:'SET_REQUIRED_DIMENSION',field:'width',value:500});
  s.dispatch({type:'SET_REQUIRED_DIMENSION',field:'height',value:300});
  return s.snapshot();
}

test('workspace actual and target dimensions are separated along their frame sides',()=>{
  const markup=DimensionOverlay.dimensionMarkup(workspaceSnapshot());
  assert.ok(attr(markup,'actual-width-top','x')<0,'actual width label must sit left of frame center');
  assert.ok(attr(markup,'target-width-top','x')>0,'target width label must sit right of frame center');
  assert.ok(attr(markup,'actual-height-left','y')<0,'actual height label must sit above frame center');
  assert.ok(attr(markup,'target-height-left','y')>0,'target height label must sit below frame center');
});

test('pdf diagram uses the same separated dimension label positions',()=>{
  const svg=DiagramRenderer.render(pdfSnapshot());
  assert.ok(attr(svg,'actual-width-top','x')<0,'PDF actual width label must sit left of frame center');
  assert.ok(attr(svg,'target-width-top','x')>0,'PDF target width label must sit right of frame center');
  assert.ok(attr(svg,'actual-height-left','y')<0,'PDF actual height label must sit above frame center');
  assert.ok(attr(svg,'target-height-left','y')>0,'PDF target height label must sit below frame center');
});
