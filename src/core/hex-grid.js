(function(root, factory) {
  const dep = typeof module === 'object' && module.exports
    ? require('./connectivity-validator')
    : root.ConnectivityValidator;
  const api = factory(dep);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HexGrid = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(ConnectivityValidator) {
  'use strict';
  const DELTAS = ConnectivityValidator.DELTAS;
  const axialKey = (q,r) => `${q},${r}`;
  const neighbors = (cell) => DELTAS.map(([dq,dr]) => ({q:cell.q+dq,r:cell.r+dr}));

  function normalizeCell(c) {
    if (!c || !Number.isInteger(c.q) || !Number.isInteger(c.r)) throw new TypeError('axial coordinates must be integers');
    return {q:c.q,r:c.r};
  }

  function create(initialCells = []) {
    const map = new Map();
    for (const raw of initialCells) {
      const c = normalizeCell(raw);
      const k = axialKey(c.q,c.r);
      if (map.has(k)) throw new Error(`duplicate cell ${k}`);
      map.set(k,c);
    }
    if (!ConnectivityValidator.isConnected([...map.values()])) throw new Error('initial cells must be connected');

    const api = {
      add(q,r) {
        if (!Number.isInteger(q) || !Number.isInteger(r)) return {ok:false, reason:'invalid_coordinates'};
        const k = axialKey(q,r);
        if (map.has(k)) return {ok:false, reason:'duplicate'};
        if (map.size > 0) {
          const touches = neighbors({q,r}).some(n => map.has(axialKey(n.q,n.r)));
          if (!touches) return {ok:false, reason:'must_touch'};
        }
        map.set(k,{q,r});
        return {ok:true};
      },
      remove(q,r) {
        const k = axialKey(q,r);
        if (!map.has(k)) return {ok:false, reason:'not_found'};
        if (map.size === 1) return {ok:false, reason:'use_clear'};
        const current = [...map.values()];
        if (!ConnectivityValidator.canRemove(current,k)) return {ok:false, reason:'disconnects'};
        map.delete(k);
        return {ok:true};
      },
      has(q,r) { return map.has(axialKey(q,r)); },
      cells() { return [...map.values()].map(c => ({...c})); },
      cloneCells() { return [...map.values()].map(c => ({...c})); },
      availableNeighbors() {
        const out = new Map();
        if (map.size === 0) return [];
        for (const c of map.values()) {
          for (const n of neighbors(c)) {
            const k = axialKey(n.q,n.r);
            if (!map.has(k)) out.set(k,n);
          }
        }
        return [...out.values()].sort((a,b) => a.q-b.q || a.r-b.r);
      },
      freeFaces() {
        const out = [];
        for (const c of map.values()) {
          DELTAS.forEach(([dq,dr], sideIndex) => {
            const target = {q:c.q+dq, r:c.r+dr};
            if (!map.has(axialKey(target.q,target.r))) {
              out.push({owner:{q:c.q,r:c.r}, sideIndex, target});
            }
          });
        }
        return out.sort((a,b) =>
          a.owner.q-b.owner.q || a.owner.r-b.owner.r || a.sideIndex-b.sideIndex
        );
      }
    };
    return api;
  }

  return { axialKey, neighbors, create };
});
