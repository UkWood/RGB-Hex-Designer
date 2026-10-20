const test = require('node:test');
const assert = require('node:assert/strict');
const HexGrid = require('../src/core/hex-grid');
const ConnectivityValidator = require('../src/core/connectivity-validator');

const keys = (cells) => cells.map(c => `${c.q},${c.r}`).sort();

test('first_hex_may_be_added_anywhere', () => {
  const grid = HexGrid.create();
  assert.deepEqual(grid.add(7, -3), {ok: true});
  assert.deepEqual(keys(grid.cloneCells()), ['7,-3']);
});

test('subsequent_hex_must_touch_existing_hex', () => {
  const grid = HexGrid.create([{q:0,r:0}]);
  const before = grid.cloneCells();
  const result = grid.add(3, 3);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'must_touch');
  assert.deepEqual(grid.cloneCells(), before);
});

test('duplicate_hex_is_rejected', () => {
  const grid = HexGrid.create([{q:0,r:0}]);
  const before = grid.cloneCells();
  const result = grid.add(0,0);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'duplicate');
  assert.deepEqual(grid.cloneCells(), before);
});

test('removing_middle_of_chain_is_rejected', () => {
  const cells = [{q:0,r:0},{q:1,r:0},{q:2,r:0}];
  const grid = HexGrid.create(cells);
  const before = grid.cloneCells();
  const result = grid.remove(1,0);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'disconnects');
  assert.deepEqual(grid.cloneCells(), before);
});

test('removing_articulation_hex_in_branched_fixture_is_rejected', () => {
  const cells = [{q:0,r:0},{q:1,r:0},{q:0,r:-1},{q:-1,r:1}];
  assert.equal(ConnectivityValidator.isConnected(cells), true);
  const grid = HexGrid.create(cells);
  const before = grid.cloneCells();
  const result = grid.remove(0,0);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'disconnects');
  assert.deepEqual(grid.cloneCells(), before);
});

test('valid_leaf_removal_succeeds', () => {
  const grid = HexGrid.create([{q:0,r:0},{q:1,r:0},{q:2,r:0}]);
  assert.deepEqual(grid.remove(2,0), {ok:true});
  assert.deepEqual(keys(grid.cells()), ['0,0','1,0']);
});

test('available_neighbors_are_unique', () => {
  const grid = HexGrid.create([{q:0,r:0},{q:1,r:0}]);
  const list = grid.availableNeighbors().map(c => HexGrid.axialKey(c.q,c.r));
  assert.equal(new Set(list).size, list.length);
  assert.equal(list.includes('0,0'), false);
  assert.equal(list.includes('1,0'), false);
});

test('final_hex_removal_requires_clear', () => {
  const grid = HexGrid.create([{q:0,r:0}]);
  assert.deepEqual(grid.remove(0,0), {ok:false, reason:'use_clear'});
});


test('single_hex_exposes_one_add_target_per_face', () => {
  const grid = HexGrid.create([{q:0,r:0}]);
  const faces = grid.freeFaces();
  assert.equal(faces.length, 6);
  assert.deepEqual(faces.map(f => f.sideIndex).sort((a,b)=>a-b), [0,1,2,3,4,5]);
  assert.deepEqual(
    faces.map(f => `${f.target.q},${f.target.r}`).sort(),
    HexGrid.neighbors({q:0,r:0}).map(c => `${c.q},${c.r}`).sort()
  );
  assert.ok(faces.every(f => f.owner.q === 0 && f.owner.r === 0));
});

test('adjacent_hexes_expose_each_free_face_individually', () => {
  const grid = HexGrid.create([{q:0,r:0},{q:1,r:0}]);
  const faces = grid.freeFaces();
  assert.equal(faces.length, 10);
  assert.equal(faces.some(f => f.owner.q===0 && f.owner.r===0 && f.target.q===1 && f.target.r===0), false);
  assert.equal(faces.some(f => f.owner.q===1 && f.owner.r===0 && f.target.q===0 && f.target.r===0), false);
  assert.ok(faces.every(f => !grid.has(f.target.q,f.target.r)));
});
