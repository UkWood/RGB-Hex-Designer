(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GeometryBuilder = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const OFFSETS = [[0,-2],[1,-1],[1,1],[0,2],[-1,1],[-1,-1]];
  const ORIENTATIONS = new Set(['pointy','flat']);
  const vKey = (gx,gy) => `${gx},${gy}`;
  const eKey = (a,b) => a < b ? `${a}|${b}` : `${b}|${a}`;

  function build(cells) {
    const ordered = [...cells].map(c=>({q:c.q,r:c.r})).sort((a,b)=>a.q-b.q || a.r-b.r);
    const vertexMap = new Map();
    const vertices = [];
    const edgeMap = new Map();
    const edges = [];
    const modules = [];

    function getVertex(gx,gy) {
      const key = vKey(gx,gy);
      let id = vertexMap.get(key);
      if (id === undefined) {
        id = vertices.length;
        vertices.push({id,key,gx,gy});
        vertexMap.set(key,id);
      }
      return id;
    }

    for (const cell of ordered) {
      const key = `${cell.q},${cell.r}`;
      const cx = 2*cell.q + cell.r;
      const cy = 3*cell.r;
      const vertexIds = OFFSETS.map(([dx,dy]) => getVertex(cx+dx,cy+dy));
      modules.push({key,q:cell.q,r:cell.r,vertexIds:[...vertexIds]});
      for (let i=0;i<6;i++) {
        const u = vertexIds[i];
        const v = vertexIds[(i+1)%6];
        const ku = vertices[u].key, kv = vertices[v].key;
        const keyEdge = eKey(ku,kv);
        if (edgeMap.has(keyEdge)) {
          edges[edgeMap.get(keyEdge)].moduleKeys.push(key);
        } else {
          const id = edges.length;
          edges.push({id,u,v,moduleKeys:[key],shared:false});
          edgeMap.set(keyEdge,id);
        }
      }
    }
    for (const e of edges) e.shared = e.moduleKeys.length > 1;
    return {vertices,edges,modules};
  }

  function normalizeOrientation(orientation) {
    return ORIENTATIONS.has(orientation) ? orientation : 'pointy';
  }

  function rotatePoint(point, orientation='pointy') {
    if (normalizeOrientation(orientation) === 'flat') return {x:-point.y,y:point.x};
    return {x:point.x,y:point.y};
  }

  function toWorld(vertex, sideLength, orientation='pointy') {
    const point = {
      x: vertex.gx * (Math.sqrt(3)/2) * sideLength,
      y: vertex.gy * 0.5 * sideLength
    };
    return rotatePoint(point,orientation);
  }

  return { build, toWorld, rotatePoint, normalizeOrientation, OFFSETS };
});
