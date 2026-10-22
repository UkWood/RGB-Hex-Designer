const test=require('node:test');
const assert=require('node:assert/strict');
const GeometryBuilder=require('../src/core/geometry-builder');
const BoundaryAnalyzer=require('../src/core/boundary-analyzer');
const RouteOptimizer=require('../src/core/route-optimizer');
const EndpointSelector=require('../src/core/endpoint-selector');
const DisplayNumbering=require('../src/core/display-numbering');

function solved(cells,orientation='pointy'){
  const graph=GeometryBuilder.build(cells);
  const boundary=BoundaryAnalyzer.analyze(graph,orientation);
  const ep=EndpointSelector.autoSelect(graph,boundary,RouteOptimizer.prepare(graph,'min_repeats'),100,orientation);
  return {graph,solution:ep.solution,startId:ep.startId,endId:ep.endId,orientation};
}

test('edge_numbers_follow_first_route_encounter_and_repeated_traversals_reuse_number',()=>{
  const {graph,solution,startId,orientation}=solved([{q:0,r:0}]);
  const n=DisplayNumbering.derive({graph,solution,startId,orientation,edgeMm:100});
  assert.equal(Object.keys(n.edgeNumberById).length,graph.edges.length);
  const first=new Map();
  solution.traversals.forEach((t,i)=>{if(!first.has(t.edgeId))first.set(t.edgeId,i);});
  const expected=[...first.entries()].sort((a,b)=>a[1]-b[1]).map(([edgeId],i)=>[edgeId,i+1]);
  for(const [edgeId,number] of expected)assert.equal(n.edgeNumberById[edgeId],number);
  for(const t of solution.traversals)assert.equal(n.edgeNumberById[t.edgeId],expected.find(x=>x[0]===t.edgeId)[1]);
});

test('spec_rows_have_one_row_per_physical_edge_and_additional_passes_are_count_minus_one',()=>{
  const {graph,solution,startId,orientation}=solved([{q:0,r:0}]);
  const n=DisplayNumbering.derive({graph,solution,startId,orientation,edgeMm:100});
  assert.equal(n.specRows.length,graph.edges.length);
  assert.deepEqual(n.specRows.map(r=>r.number),Array.from({length:graph.edges.length},(_,i)=>i+1));
  for(const row of n.specRows){
    const count=solution.traversals.filter(t=>t.edgeId===row.edgeId).length;
    assert.equal(row.additionalPasses,count-1);
    assert.equal(n.traversalCountByEdgeId[row.edgeId],count);
  }
});

test('hex_numbers_prioritize_graph_distance_from_start_then_route_encounter',()=>{
  const cells=[{q:0,r:0},{q:1,r:0},{q:2,r:0},{q:2,r:1}];
  const {graph,solution,startId,orientation}=solved(cells);
  const n=DisplayNumbering.derive({graph,solution,startId,orientation,edgeMm:100});
  assert.equal(Object.keys(n.hexNumberByKey).length,cells.length);
  const ordered=[...graph.modules].sort((a,b)=>n.hexNumberByKey[a.key]-n.hexNumberByKey[b.key]);
  for(let i=1;i<ordered.length;i++){
    const prev=n.hexMetaByKey[ordered[i-1].key],cur=n.hexMetaByKey[ordered[i].key];
    assert.ok(prev.distance<cur.distance||prev.distance===cur.distance&&prev.firstRouteIndex<=cur.firstRouteIndex);
  }
  assert.equal(Math.min(...Object.values(n.hexNumberByKey)),1);
  assert.equal(Math.max(...Object.values(n.hexNumberByKey)),cells.length);
});

test('visual_position_is_final_tie_break_and_can_change_with_orientation',()=>{
  const cells=[{q:0,r:0},{q:1,r:0},{q:0,r:1}];
  const p=solved(cells,'pointy');
  const pointy=DisplayNumbering.derive({...p,edgeMm:100});
  const flat=DisplayNumbering.derive({graph:p.graph,solution:p.solution,startId:p.startId,orientation:'flat',edgeMm:100});
  for(const key of Object.keys(pointy.hexMetaByKey)){
    assert.ok(Number.isFinite(pointy.hexMetaByKey[key].centerX));
    assert.ok(Number.isFinite(pointy.hexMetaByKey[key].centerY));
    assert.ok(Number.isFinite(flat.hexMetaByKey[key].centerX));
    assert.ok(Number.isFinite(flat.hexMetaByKey[key].centerY));
  }
});
