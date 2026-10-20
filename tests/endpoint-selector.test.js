const test=require('node:test');
const assert=require('node:assert/strict');
const GeometryBuilder=require('../src/core/geometry-builder');
const BoundaryAnalyzer=require('../src/core/boundary-analyzer');
const RouteOptimizer=require('../src/core/route-optimizer');
const EndpointSelector=require('../src/core/endpoint-selector');

test('rank_tuple_obeys_repeat_shared_length_then_separation_priority',()=>{
  const a={id:0,gx:0,gy:2}, b={id:1,gx:4,gy:2};
  const mk=(r,s,t)=>({repeatCount:r,repeatSharedCount:s,totalSegmentCount:t});
  assert.ok(EndpointSelector.rankTuple(mk(1,9,99),a,b,100)[0] < EndpointSelector.rankTuple(mk(2,0,1),a,b,100)[0]);
  assert.ok(EndpointSelector.rankTuple(mk(1,0,99),a,b,100)[1] < EndpointSelector.rankTuple(mk(1,1,1),a,b,100)[1]);
  assert.ok(EndpointSelector.rankTuple(mk(1,0,5),a,b,100)[2] < EndpointSelector.rankTuple(mk(1,0,6),a,b,100)[2]);
  const c={id:2,gx:8,gy:2};
  assert.ok(EndpointSelector.rankTuple(mk(1,0,5),a,c,100)[3] < EndpointSelector.rankTuple(mk(1,0,5),a,b,100)[3]);
});

test('manual_endpoint_validation_rejects_upper_and_same',()=>{
  const g=GeometryBuilder.build([{q:0,r:0},{q:0,r:1}]);
  const ba=BoundaryAnalyzer.analyze(g);
  const low=ba.lowerCandidateIds[0];
  const upper=ba.externalVertexIds.find(id=>!ba.lowerCandidateIds.includes(id));
  assert.deepEqual(EndpointSelector.validateManual(ba,low,low),{ok:false,reason:'same_endpoint'});
  assert.deepEqual(EndpointSelector.validateManual(ba,upper,low),{ok:false,reason:'not_lower_boundary'});
});

test('auto_on_one_hex_returns_distinct_lower_pair_and_connected_route',()=>{
  const g=GeometryBuilder.build([{q:0,r:0}]);
  const ba=BoundaryAnalyzer.analyze(g);
  const prep=RouteOptimizer.prepare(g,'min_repeats');
  const result=EndpointSelector.autoSelect(g,ba,prep,100);
  assert.ok(ba.lowerCandidateIds.includes(result.startId));
  assert.ok(ba.lowerCandidateIds.includes(result.endId));
  assert.notEqual(result.startId,result.endId);
  assert.equal(result.solution.vertexTrail[0],result.startId);
  assert.equal(result.solution.vertexTrail.at(-1),result.endId);
});

test('auto_orientation_is_left_to_right_for_selected_pair',()=>{
  const g=GeometryBuilder.build([{q:0,r:0},{q:1,r:0}]);
  const ba=BoundaryAnalyzer.analyze(g);
  const result=EndpointSelector.autoSelect(g,ba,RouteOptimizer.prepare(g,'min_repeats'),100);
  assert.ok(g.vertices[result.startId].gx <= g.vertices[result.endId].gx);
});
