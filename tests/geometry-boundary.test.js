const test = require('node:test');
const assert = require('node:assert/strict');
const GeometryBuilder = require('../src/core/geometry-builder');
const BoundaryAnalyzer = require('../src/core/boundary-analyzer');

function edgeWorldLength(graph, edge, side=100) {
  const a = GeometryBuilder.toWorld(graph.vertices[edge.u], side);
  const b = GeometryBuilder.toWorld(graph.vertices[edge.v], side);
  return Math.hypot(a.x-b.x, a.y-b.y);
}

test('one_hex_produces_six_vertices_and_edges', () => {
  const g = GeometryBuilder.build([{q:0,r:0}]);
  assert.equal(g.vertices.length, 6);
  assert.equal(g.edges.length, 6);
  assert.equal(g.modules.length, 1);
});

test('two_adjacent_hexes_share_one_unique_edge', () => {
  const g = GeometryBuilder.build([{q:0,r:0},{q:1,r:0}]);
  assert.equal(g.vertices.length, 10);
  assert.equal(g.edges.length, 11);
  assert.equal(g.edges.filter(e => e.shared).length, 1);
  assert.equal(g.edges.find(e => e.shared).moduleKeys.length, 2);
});

test('three_compact_cells_deduplicate_corners_deterministically', () => {
  const cells = [{q:0,r:0},{q:1,r:0},{q:0,r:1}];
  const a = GeometryBuilder.build(cells);
  const b = GeometryBuilder.build([...cells].reverse());
  assert.deepEqual(a.vertices.map(v=>v.key), b.vertices.map(v=>v.key));
  assert.deepEqual(a.edges.map(e=>[a.vertices[e.u].key,a.vertices[e.v].key,e.shared]), b.edges.map(e=>[b.vertices[e.u].key,b.vertices[e.v].key,e.shared]));
});

test('every_corridor_edge_has_physical_length_equal_to_side', () => {
  const g = GeometryBuilder.build([{q:0,r:0},{q:1,r:0},{q:0,r:1}]);
  for (const e of g.edges) assert.ok(Math.abs(edgeWorldLength(g,e,137)-137) < 1e-9);
});

test('normal_height_lower_candidates_obey_bottom_quarter_rule', () => {
  const g = GeometryBuilder.build([{q:0,r:0},{q:0,r:1},{q:0,r:2}]);
  const a = BoundaryAnalyzer.analyze(g);
  assert.equal(a.flatRow, false);
  const threshold = a.bounds.yMax - 0.25*a.bounds.height;
  assert.ok(a.lowerCandidateIds.length >= 2);
  for (const id of a.lowerCandidateIds) assert.ok(g.vertices[id].gy >= threshold);
});

test('single_horizontal_axial_row_uses_floor_band_and_excludes_upper_corners', () => {
  const g = GeometryBuilder.build([{q:0,r:0},{q:1,r:0},{q:2,r:0}]);
  const a = BoundaryAnalyzer.analyze(g);
  assert.equal(a.flatRow, true);
  assert.ok(a.lowerCandidateIds.length >= 2);
  for (const id of a.lowerCandidateIds) assert.ok(g.vertices[id].gy >= a.bounds.yMax - 1);
  assert.equal(a.lowerCandidateIds.some(id => g.vertices[id].gy < a.bounds.yMax - 1), false);
});

test('one_hex_flat_fallback_has_multiple_lower_endpoint_candidates', () => {
  const g = GeometryBuilder.build([{q:0,r:0}]);
  const a = BoundaryAnalyzer.analyze(g);
  assert.ok(a.lowerCandidateIds.length >= 2);
});

test('every_lower_candidate_is_on_external_boundary', () => {
  const g = GeometryBuilder.build([{q:0,r:0},{q:1,r:0},{q:0,r:1},{q:-1,r:1}]);
  const a = BoundaryAnalyzer.analyze(g);
  const ext = new Set(a.externalVertexIds);
  for (const id of a.lowerCandidateIds) assert.equal(ext.has(id), true);
});
