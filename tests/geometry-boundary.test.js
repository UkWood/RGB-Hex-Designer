const test = require('node:test');
const assert = require('node:assert/strict');
const GeometryBuilder = require('../src/core/geometry-builder');
const BoundaryAnalyzer = require('../src/core/boundary-analyzer');

function edgeWorldLength(graph, edge, side=100, orientation='pointy') {
  const a = GeometryBuilder.toWorld(graph.vertices[edge.u], side, orientation);
  const b = GeometryBuilder.toWorld(graph.vertices[edge.v], side, orientation);
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

test('every_corridor_edge_has_physical_length_equal_to_side_in_both_orientations', () => {
  const g = GeometryBuilder.build([{q:0,r:0},{q:1,r:0},{q:0,r:1}]);
  for (const orientation of ['pointy','flat']) for (const e of g.edges) assert.ok(Math.abs(edgeWorldLength(g,e,137,orientation)-137) < 1e-9);
});

test('flat_orientation_is_exact_ninety_degree_rotation_of_pointy_world_geometry',()=>{
  const g=GeometryBuilder.build([{q:0,r:0},{q:1,r:0}]);
  for(const v of g.vertices){
    const p=GeometryBuilder.toWorld(v,100,'pointy');
    const f=GeometryBuilder.toWorld(v,100,'flat');
    assert.ok(Math.abs(f.x + p.y)<1e-9);
    assert.ok(Math.abs(f.y - p.x)<1e-9);
  }
});

test('normal_height_lower_candidates_obey_bottom_quarter_rule', () => {
  const g = GeometryBuilder.build([{q:0,r:0},{q:0,r:1},{q:0,r:2}]);
  const a = BoundaryAnalyzer.analyze(g,'pointy');
  assert.equal(a.flatRow, false);
  const threshold = a.bounds.yMax - 0.25*a.bounds.height;
  assert.ok(a.lowerCandidateIds.length >= 2);
  for (const id of a.lowerCandidateIds) assert.ok(g.vertices[id].gy >= threshold);
});

test('single_horizontal_axial_row_uses_floor_band_and_excludes_upper_corners', () => {
  const g = GeometryBuilder.build([{q:0,r:0},{q:1,r:0},{q:2,r:0}]);
  const a = BoundaryAnalyzer.analyze(g,'pointy');
  assert.equal(a.flatRow, true);
  assert.ok(a.lowerCandidateIds.length >= 2);
  for (const id of a.lowerCandidateIds) assert.ok(g.vertices[id].gy >= a.bounds.yMax - 1);
  assert.equal(a.lowerCandidateIds.some(id => g.vertices[id].gy < a.bounds.yMax - 1), false);
});

test('one_hex_flat_fallback_has_multiple_lower_endpoint_candidates', () => {
  const g = GeometryBuilder.build([{q:0,r:0}]);
  const a = BoundaryAnalyzer.analyze(g,'pointy');
  assert.ok(a.lowerCandidateIds.length >= 2);
});

test('rotated_field_recomputes_lower_candidates_using_visual_bottom',()=>{
  const g=GeometryBuilder.build([{q:0,r:0},{q:1,r:0},{q:1,r:1}]);
  const pointy=BoundaryAnalyzer.analyze(g,'pointy');
  const flat=BoundaryAnalyzer.analyze(g,'flat');
  assert.ok(flat.lowerCandidateIds.length>=2);
  assert.notDeepEqual(flat.lowerCandidateIds,pointy.lowerCandidateIds);
  const maxY=Math.max(...flat.externalVertexIds.map(id=>GeometryBuilder.toWorld(g.vertices[id],1,'flat').y));
  const minY=Math.min(...flat.externalVertexIds.map(id=>GeometryBuilder.toWorld(g.vertices[id],1,'flat').y));
  const threshold=maxY-.25*(maxY-minY);
  for(const id of flat.lowerCandidateIds){
    const y=GeometryBuilder.toWorld(g.vertices[id],1,'flat').y;
    assert.ok(y>=threshold-1e-9||flat.flatRow);
  }
});

test('every_lower_candidate_is_on_external_boundary', () => {
  const g = GeometryBuilder.build([{q:0,r:0},{q:1,r:0},{q:0,r:1},{q:-1,r:1}]);
  for(const orientation of ['pointy','flat']){
    const a = BoundaryAnalyzer.analyze(g,orientation);
    const ext = new Set(a.externalVertexIds);
    for (const id of a.lowerCandidateIds) assert.equal(ext.has(id), true);
  }
});
