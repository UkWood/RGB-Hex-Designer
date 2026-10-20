(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BoundaryAnalyzer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function analyze(graph) {
    const externalEdgeIds = graph.edges.filter(e => e.moduleKeys.length === 1).map(e => e.id);
    const extSet = new Set();
    for (const id of externalEdgeIds) {
      const e = graph.edges[id];
      extSet.add(e.u); extSet.add(e.v);
    }
    const externalVertexIds = [...extSet].sort((a,b)=>a-b);
    if (externalVertexIds.length === 0) {
      return {externalEdgeIds,externalVertexIds,lowerCandidateIds:[],bounds:{yMin:0,yMax:0,height:0},flatRow:true};
    }
    const ys = externalVertexIds.map(id => graph.vertices[id].gy);
    const yMin = Math.min(...ys), yMax = Math.max(...ys), height = yMax-yMin;
    const rs = new Set(graph.modules.map(m => m.r));
    const flatRow = rs.size <= 1;
    let lowerCandidateIds;
    if (flatRow || height <= 1) {
      const tolerance = 1;
      lowerCandidateIds = externalVertexIds.filter(id => graph.vertices[id].gy >= yMax - tolerance);
    } else {
      const threshold = yMax - 0.25*height;
      lowerCandidateIds = externalVertexIds.filter(id => graph.vertices[id].gy >= threshold - 1e-12);
    }
    lowerCandidateIds.sort((a,b) => graph.vertices[a].gx-graph.vertices[b].gx || graph.vertices[a].gy-graph.vertices[b].gy || a-b);
    return {externalEdgeIds,externalVertexIds,lowerCandidateIds,bounds:{yMin,yMax,height},flatRow};
  }

  function isValidLowerEndpoint(analysis, vertexId) {
    return analysis.lowerCandidateIds.includes(vertexId);
  }

  return { analyze, isValidLowerEndpoint };
});
