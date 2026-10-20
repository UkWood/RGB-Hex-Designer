(function(root, factory) {
  const blossom = typeof module === 'object' && module.exports
    ? require('../vendor/edmonds-blossom')
    : root.EdmondsBlossom;
  const api = factory(blossom);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MinWeightPerfectMatching = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(EdmondsBlossom) {
  'use strict';

  function solve(vertexIds, distance) {
    if (!Array.isArray(vertexIds) || vertexIds.length % 2 !== 0) {
      throw new Error('perfect matching requires an even vertex count');
    }
    if (typeof distance !== 'function') throw new Error('distance must be a function');

    const ids = [...vertexIds].sort((a,b)=>a-b);
    const n = ids.length;
    if (n === 0) return {cost:0,pairs:[]};

    const distances = Array.from({length:n},()=>Array(n).fill(Infinity));
    let maxDistance = 0;
    for (let i=0;i<n;i++) {
      distances[i][i]=0;
      for (let j=i+1;j<n;j++) {
        const d=Number(distance(ids[i],ids[j]));
        if (!Number.isFinite(d) || d < 0) continue;
        distances[i][j]=distances[j][i]=d;
        if (d>maxDistance) maxDistance=d;
      }
    }

    const base=maxDistance+1;
    const edges=[];
    for (let i=0;i<n;i++) {
      for (let j=i+1;j<n;j++) {
        const d=distances[i][j];
        if (Number.isFinite(d)) edges.push([i,j,base-d]);
      }
    }
    if (!edges.length) throw new Error('no finite perfect matching');

    const mate=EdmondsBlossom(edges,true);
    if (!Array.isArray(mate) || mate.length<n) throw new Error('matching solver failed');

    const pairs=[];
    let cost=0;
    for (let i=0;i<n;i++) {
      const j=mate[i];
      if (!Number.isInteger(j) || j<0 || j>=n || mate[j]!==i) {
        throw new Error('no finite perfect matching');
      }
      if (i<j) {
        const d=distances[i][j];
        if (!Number.isFinite(d)) throw new Error('no finite perfect matching');
        const a=ids[i], b=ids[j];
        pairs.push(a<b?[a,b]:[b,a]);
        cost+=d;
      }
    }
    if (pairs.length!==n/2) throw new Error('no finite perfect matching');
    pairs.sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
    return {cost,pairs};
  }

  return { solve };
});
