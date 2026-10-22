const test = require('node:test');
const assert = require('node:assert/strict');
const Matching = require('../src/core/min-weight-perfect-matching');
const RouteOptimizer = require('../src/core/route-optimizer');

function exhaustive(ids, distance) {
  if (ids.length === 0) return 0;
  const a = ids[0];
  let best = Infinity;
  for (let i=1;i<ids.length;i++) {
    const b = ids[i];
    const rest = ids.slice(1,i).concat(ids.slice(i+1));
    best = Math.min(best, distance(a,b)+exhaustive(rest,distance));
  }
  return best;
}

test('exact_matching_known_4_6_8_vertex_fixtures', () => {
  for (const n of [4,6,8]) {
    const ids = Array.from({length:n},(_,i)=>i);
    const distance = (a,b) => Math.abs(a-b);
    const result = Matching.solve(ids,distance);
    assert.equal(result.cost,n/2);
    assert.equal(result.pairs.length,n/2);
  }
});

test('randomized_matching_up_to_12_matches_exhaustive_oracle', () => {
  let seed = 123456789;
  const rnd = () => (seed = (1664525*seed + 1013904223) >>> 0) / 2**32;
  for (const n of [2,4,6,8,10,12]) {
    for (let round=0; round<3; round++) {
      const points = Array.from({length:n},()=>({x:Math.floor(rnd()*20),y:Math.floor(rnd()*20)}));
      const d = (a,b) => Math.abs(points[a].x-points[b].x)+Math.abs(points[a].y-points[b].y);
      const ids = Array.from({length:n},(_,i)=>i);
      assert.equal(Matching.solve(ids,d).cost, exhaustive(ids,d));
    }
  }
});

test('larger_14_vertex_matching_fixture_is_exact_and_stable', () => {
  const ids = Array.from({length:14},(_,i)=>i);
  const d = (a,b) => Math.abs(a-b);
  const a = Matching.solve(ids,d);
  const b = Matching.solve(ids,d);
  assert.equal(a.cost,7);
  assert.deepEqual(a,b);
  assert.deepEqual(a.pairs, [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13]]);
});

test('weighted_blossom_scales_to_28_parity_vertices', () => {
  const ids = Array.from({length:28},(_,i)=>i);
  const d = (a,b) => Math.abs(a-b);
  const started = performance.now();
  const result = Matching.solve(ids,d);
  const elapsedMs = performance.now() - started;
  assert.equal(result.cost,14);
  assert.deepEqual(result.pairs, Array.from({length:14},(_,i)=>[2*i,2*i+1]));
  assert.ok(elapsedMs < 1500, `matching took ${elapsedMs.toFixed(0)} ms; expected polynomial-time solver`);
});

function graph(vertexCount, edgeDefs) {
  return {
    vertices: Array.from({length:vertexCount},(_,id)=>({id,key:String(id),gx:id,gy:0})),
    edges: edgeDefs.map((e,id)=>({id,u:e[0],v:e[1],shared:!!e[2],moduleKeys:e[2]?['a','b']:['a']})),
    modules: []
  };
}

function assertContinuous(solution,start,end,edgeCount) {
  assert.equal(solution.vertexTrail[0],start);
  assert.equal(solution.vertexTrail.at(-1),end);
  assert.equal(solution.traversals.length,solution.vertexTrail.length-1);
  for (let i=0;i<solution.traversals.length;i++) {
    const t=solution.traversals[i];
    assert.equal(t.from,solution.vertexTrail[i]);
    assert.equal(t.to,solution.vertexTrail[i+1]);
  }
  const covered = new Set(solution.traversals.map(t=>t.edgeId));
  assert.equal(covered.size,edgeCount);
}

test('euler_start_end_trail_returns_zero_repeats', () => {
  const g = graph(4, [[0,1],[1,2],[2,3]]);
  const s = RouteOptimizer.prepare(g,'min_repeats').solve(0,3);
  assert.equal(s.repeatCount,0);
  assert.equal(s.eulerWithoutRepeats,true);
  assertContinuous(s,0,3,g.edges.length);
});

test('parity_correction_duplicates_minimum_number_of_edges', () => {
  const g = graph(4, [[0,1],[1,2],[2,3],[3,0]]);
  const s = RouteOptimizer.prepare(g,'min_repeats').solve(0,2);
  assert.equal(s.repeatCount,2);
  assert.equal(s.totalSegmentCount,6);
  assertContinuous(s,0,2,g.edges.length);
});

test('avoid_shared_prefers_longer_outer_detour_over_shared_duplicate', () => {
  const g = graph(4, [[0,1,true],[0,2,false],[2,3,false],[3,1,false]]);
  const min = RouteOptimizer.prepare(g,'min_repeats').solve(0,1);
  const avoid = RouteOptimizer.prepare(g,'avoid_shared').solve(0,1);
  assert.equal(min.repeatCount,1);
  assert.equal(min.repeatSharedCount,1);
  assert.equal(avoid.repeatCount,3);
  assert.equal(avoid.repeatSharedCount,0);
  assertContinuous(avoid,0,1,g.edges.length);
});

test('all_original_edges_are_covered_and_traversals_connect', () => {
  const g = graph(5, [[0,1],[1,2],[2,3],[3,0],[1,4]]);
  const s = RouteOptimizer.prepare(g,'min_repeats').solve(0,4);
  assertContinuous(s,0,4,g.edges.length);
  const firstPass = new Map();
  for (const t of s.traversals) {
    const seen=firstPass.get(t.edgeId)||0;
    assert.equal(t.repeat,seen>0);
    firstPass.set(t.edgeId,seen+1);
  }
});

test('min_repeats_tie_prefers_fewer_shared_repeated_segments', () => {
  const g = graph(4, [[0,1,true],[1,3,false],[0,2,false],[2,3,false]]);
  const s = RouteOptimizer.prepare(g,'min_repeats').solve(0,3);
  assert.equal(s.repeatCount,2);
  assert.equal(s.repeatSharedCount,0);
});

test('same_start_end_builds_closed_chinese_postman_circuit_covering_every_edge',()=>{
  const g=graph(4,[[0,1],[1,2],[2,3]]);
  const s=RouteOptimizer.prepare(g,'min_repeats').solve(0,0);
  assertContinuous(s,0,0,g.edges.length);
  assert.equal(s.repeatCount,3);
  assert.equal(s.totalSegmentCount,6);
  assert.deepEqual(s.duplicateCounts,[1,1,1]);
  const counts=Array(g.edges.length).fill(0);for(const t of s.traversals)counts[t.edgeId]++;
  assert.deepEqual(counts,[2,2,2]);
});
