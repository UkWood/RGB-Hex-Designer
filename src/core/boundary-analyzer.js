(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BoundaryAnalyzer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function orientationName(value) {
    return value === 'flat' ? 'flat' : 'pointy';
  }

  function visualCoords(vertex, orientation='pointy') {
    if (orientationName(orientation) === 'flat') return {x:-vertex.gy,y:vertex.gx};
    return {x:vertex.gx,y:vertex.gy};
  }

  function analyze(graph, orientation='pointy') {
    orientation = orientationName(orientation);
    const externalEdgeIds = graph.edges.filter(e => e.moduleKeys.length === 1).map(e => e.id);
    const extSet = new Set();
    for (const id of externalEdgeIds) {
      const e = graph.edges[id];
      extSet.add(e.u); extSet.add(e.v);
    }
    const externalVertexIds = [...extSet].sort((a,b)=>a-b);
    if (externalVertexIds.length === 0) {
      return {externalEdgeIds,externalVertexIds,lowerCandidateIds:[],bounds:{yMin:0,yMax:0,height:0},flatRow:true,orientation};
    }

    const coords = new Map(externalVertexIds.map(id=>[id,visualCoords(graph.vertices[id],orientation)]));
    const ys = externalVertexIds.map(id => coords.get(id).y);
    const yMin = Math.min(...ys), yMax = Math.max(...ys), height = yMax-yMin;
    const rowKeys = orientation === 'flat'
      ? new Set(graph.modules.map(m => 2*m.q + m.r))
      : new Set(graph.modules.map(m => m.r));
    const flatRow = rowKeys.size <= 1;
    let lowerCandidateIds;
    if (flatRow || height <= 1) {
      const tolerance = 1;
      lowerCandidateIds = externalVertexIds.filter(id => coords.get(id).y >= yMax - tolerance);
    } else {
      const threshold = yMax - 0.25*height;
      lowerCandidateIds = externalVertexIds.filter(id => coords.get(id).y >= threshold - 1e-12);
    }
    lowerCandidateIds.sort((a,b) => coords.get(a).x-coords.get(b).x || coords.get(a).y-coords.get(b).y || a-b);
    return {externalEdgeIds,externalVertexIds,lowerCandidateIds,bounds:{yMin,yMax,height},flatRow,orientation};
  }

  function isValidLowerEndpoint(analysis, vertexId) {
    return analysis.lowerCandidateIds.includes(vertexId);
  }

  return { analyze, isValidLowerEndpoint, visualCoords };
});
