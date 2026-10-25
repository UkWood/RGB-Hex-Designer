const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const EditorState=require('../src/app/editor-state');
const ProjectIO=require('../src/core/project-io');
const GeometryBuilder=require('../src/core/geometry-builder');

const ROOT=path.join(__dirname,'..');
function exporter(){return require('../src/core/gyvertwink-export');}
function oneHex(){
  const state=EditorState.create();
  assert.equal(state.dispatch({type:'ADD_HEX',q:0,r:0}).ok,true);
  return state;
}
function customerProject(){
  const source=fs.readFileSync(path.join(ROOT,'examples','hex-router-project_1.json'),'utf8');
  const parsed=ProjectIO.parse(source);
  assert.equal(parsed.ok,true);
  const state=EditorState.create();
  assert.equal(state.dispatch({type:'LOAD_PROJECT',project:parsed.project}).ok,true);
  return state;
}
function allNumbers(value,out=[]){
  if(typeof value==='number')out.push(value);
  else if(Array.isArray(value))for(const item of value)allNumbers(item,out);
  else if(value&&typeof value==='object')for(const item of Object.values(value))allNumbers(item,out);
  return out;
}
const round1=v=>Math.round(v*10)/10+0;
function firstLedForTraversal(snap,t){
  const world=snap.graph.vertices.map(v=>GeometryBuilder.toWorld(v,snap.strip.edgeMm,snap.orientation));
  const bounds=GeometryBuilder.worldBounds(snap.graph,snap.strip.edgeMm,snap.orientation);
  const a={x:world[t.from].x-bounds.minX,y:world[t.from].y-bounds.minY};
  const b={x:world[t.to].x-bounds.minX,y:world[t.to].y-bounds.minY};
  const f=1/(snap.strip.segmentsPerEdge+1);
  return [round1(a.x+(b.x-a.x)*f),round1(a.y+(b.y-a.y)*f)];
}

test('gyvertwink exporter rejects an empty project with the required message',()=>{
  const result=exporter().build(EditorState.create().snapshot());
  assert.deepEqual(result,{ok:false,error:'Сначала создайте трассируемую схему.'});
});

test('one hex exports LEDs once per physical edge and unique outline in millimetres',()=>{
  const snap=oneHex().snapshot();
  const result=exporter().build(snap);
  assert.equal(result.ok,true);
  const d=result.data;
  assert.equal(d.gyvertwink_map,1);
  assert.equal(d.unit,'mm');
  assert.deepEqual(d.project,{name:''});
  assert.equal(d.led_count,d.leds.length);
  assert.equal(d.led_count,snap.graph.edges.length*snap.strip.segmentsPerEdge);
  assert.equal(d.outline.length,snap.graph.edges.length);
  assert.equal(d.width_mm,173.2);
  assert.equal(d.height_mm,200);
  assert.deepEqual(Object.keys(d),['gyvertwink_map','unit','project','led_count','width_mm','height_mm','start','end','leds','outline']);
});

test('customer example keeps route repeats as wire only and exports 324 LEDs',()=>{
  const state=customerProject();
  const snap=state.snapshot();
  assert.equal(snap.cells.length,11);
  assert.equal(snap.graph.edges.length,54);
  assert.equal(snap.solution.traversals.length,63);
  assert.equal(snap.solution.repeatCount,9);
  assert.equal(snap.routing.startId,32);
  assert.equal(snap.routing.endId,34);
  assert.equal(snap.strip.segmentsPerEdge,6);
  assert.equal(snap.strip.edgeMm,100);

  const result=exporter().build(snap);
  assert.equal(result.ok,true);
  const d=result.data;
  assert.equal(d.led_count,324);
  assert.equal(d.leds.length,324);
  assert.equal(d.led_count,(snap.solution.traversals.length-snap.solution.repeatCount)*snap.strip.segmentsPerEdge);
  assert.equal(d.led_count,snap.graph.edges.length*snap.strip.segmentsPerEdge);
  assert.equal(d.width_mm,866);
  assert.equal(d.height_mm,800);
  assert.deepEqual(d.start,{x:519.6,y:650});
  assert.deepEqual(d.end,{x:692.8,y:750});
  assert.deepEqual(d.leds[0],[507.2,642.9]);
  assert.equal(d.outline.length,54);
  assert.deepEqual(d.outline[0],[86.6,600,173.2,650]);

  const litTraversals=snap.solution.traversals.filter(t=>!t.repeat);
  assert.equal(litTraversals.length,snap.graph.edges.length);
  litTraversals.forEach((t,i)=>assert.deepEqual(d.leds[i*snap.strip.segmentsPerEdge],firstLedForTraversal(snap,t),`lit traversal ${i} must start the next LED group`));

  const nums=allNumbers(d);
  assert.ok(nums.every(Number.isFinite));
  assert.ok(nums.every(v=>v>=0));
  assert.ok(d.leds.every(([x,y])=>x<=d.width_mm&&y<=d.height_mm));
  assert.ok(d.outline.every(([x1,y1,x2,y2])=>x1<=d.width_mm&&x2<=d.width_mm&&y1<=d.height_mm&&y2<=d.height_mm));

  const step=Math.hypot(d.leds[1][0]-d.leds[0][0],d.leds[1][1]-d.leds[0][1]);
  assert.ok(Math.abs(step-(snap.strip.edgeMm/(snap.strip.segmentsPerEdge+1)))<=0.15);
});

test('customer example flat orientation keeps 324 LEDs and reference geometry',()=>{
  const state=customerProject();
  assert.equal(state.dispatch({type:'SET_ORIENTATION',orientation:'flat'}).ok,true);
  const d=exporter().build(state.snapshot()).data;
  assert.equal(d.led_count,324);
  assert.equal(d.width_mm,800);
  assert.equal(d.height_mm,866);
  assert.deepEqual(d.start,{x:50,y:692.8});
  assert.deepEqual(d.end,{x:150,y:692.8});
});

test('loaded multi-hex project exports finite nonnegative coordinates and one LED group per physical edge',()=>{
  const source=fs.readFileSync(path.join(ROOT,'examples','reference-construction.json'),'utf8');
  const parsed=ProjectIO.parse(source);
  assert.equal(parsed.ok,true);
  const state=EditorState.create();
  assert.equal(state.dispatch({type:'LOAD_PROJECT',project:parsed.project}).ok,true);
  const snap=state.snapshot();
  const result=exporter().build(snap);
  assert.equal(result.ok,true);
  assert.equal(result.data.led_count,snap.graph.edges.length*snap.strip.segmentsPerEdge);
  assert.equal(result.data.outline.length,snap.graph.edges.length);
  const nums=allNumbers(result.data);
  assert.ok(nums.length>0);
  assert.ok(nums.every(Number.isFinite));
  assert.ok(nums.every(v=>v>=0));
  assert.ok(result.data.leds.every(([x,y])=>x<=result.data.width_mm&&y<=result.data.height_mm));
  assert.ok(result.data.outline.every(([x1,y1,x2,y2])=>x1<=result.data.width_mm&&x2<=result.data.width_mm&&y1<=result.data.height_mm&&y2<=result.data.height_mm));
});

test('flat orientation rotates exported geometry exactly with Designer geometry',()=>{
  const state=oneHex();
  const pointy=exporter().build(state.snapshot()).data;
  assert.equal(state.dispatch({type:'SET_ORIENTATION',orientation:'flat'}).ok,true);
  const flat=exporter().build(state.snapshot()).data;
  assert.equal(flat.led_count,pointy.led_count);
  assert.equal(flat.width_mm,pointy.height_mm);
  assert.equal(flat.height_mm,pointy.width_mm);
});

test('same snapshot produces byte-identical data',()=>{
  const snap=oneHex().snapshot();
  const a=exporter().build(snap);
  const b=exporter().build(snap);
  assert.equal(JSON.stringify(a),JSON.stringify(b));
});

test('repeatOffsetMm no longer changes export because repeat traversals have no LEDs',()=>{
  const snap=customerProject().snapshot();
  assert.equal(snap.solution.repeatCount,9);
  const base=exporter().build(snap).data;
  const legacyOption=exporter().build(snap,{repeatOffsetMm:100}).data;
  assert.equal(base.led_count,324);
  assert.deepEqual(legacyOption,base);
});

test('closed manual START equals END route exports successfully',()=>{
  const state=oneHex();
  const first=state.snapshot().boundary.lowerCandidateIds[0];
  assert.equal(state.dispatch({type:'SET_MANUAL_START',vertexId:first}).ok,true);
  assert.equal(state.dispatch({type:'SET_MANUAL_END',vertexId:first}).ok,true);
  const result=exporter().build(state.snapshot());
  assert.equal(result.ok,true);
  assert.deepEqual(result.data.start,result.data.end);
});

test('invalid strip geometry is rejected instead of emitting invalid numbers',()=>{
  const snap=oneHex().snapshot();
  snap.strip.segmentsPerEdge=0;
  assert.deepEqual(exporter().build(snap),{ok:false,error:'Неверные параметры ленты.'});
  const snap2=oneHex().snapshot();
  snap2.strip.edgeMm=0;
  assert.deepEqual(exporter().build(snap2),{ok:false,error:'Неверные параметры ленты.'});
});
