(function(root, factory) {
  const matching = typeof module === 'object' && module.exports
    ? require('./min-weight-perfect-matching')
    : root.MinWeightPerfectMatching;
  const api = factory(matching);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RouteOptimizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(MinWeightPerfectMatching) {
  'use strict';
  const SHARED_PENALTY = 1000000;

  function prepare(graph, objective) {
    if (!['min_repeats','avoid_shared'].includes(objective)) throw new Error('unknown objective');
    const n = graph.vertices.length;
    const adj = Array.from({length:n},()=>[]);
    const degree = Array(n).fill(0);
    const repeatLexBase = n*n + 1;
    for (const e of graph.edges) {
      const cost = objective === 'avoid_shared'
        ? (e.shared ? SHARED_PENALTY + 1 : 1)
        : repeatLexBase + (e.shared ? 1 : 0);
      adj[e.u].push({to:e.v,edgeId:e.id,cost});
      adj[e.v].push({to:e.u,edgeId:e.id,cost});
      degree[e.u]++; degree[e.v]++;
    }
    for (const list of adj) list.sort((a,b)=>a.to-b.to || a.edgeId-b.edgeId);

    const dist = Array.from({length:n},()=>Array(n).fill(Infinity));
    const prev = Array.from({length:n},()=>Array(n).fill(null));

    for (let s=0;s<n;s++) {
      const used = Array(n).fill(false);
      dist[s][s]=0;
      for (let iter=0;iter<n;iter++) {
        let u=-1,best=Infinity;
        for (let i=0;i<n;i++) {
          if (!used[i] && (dist[s][i] < best - 1e-12 || (Math.abs(dist[s][i]-best)<=1e-12 && (u<0 || i<u)))) {
            best=dist[s][i];u=i;
          }
        }
        if (u<0 || !Number.isFinite(best)) break;
        used[u]=true;
        for (const a of adj[u]) {
          const nd=dist[s][u]+a.cost;
          const old=dist[s][a.to];
          const betterTie = Math.abs(nd-old)<=1e-12 && prev[s][a.to] && (u < prev[s][a.to].from || (u===prev[s][a.to].from && a.edgeId < prev[s][a.to].edgeId));
          if (nd < old - 1e-12 || betterTie || prev[s][a.to]===null && nd===old) {
            dist[s][a.to]=nd;
            prev[s][a.to]={from:u,edgeId:a.edgeId};
          }
        }
      }
    }

    const originalOdd = degree.map((d,i)=>d%2?i:null).filter(v=>v!==null);

    function pathEdges(a,b) {
      if (a===b) return [];
      if (!Number.isFinite(dist[a][b])) throw new Error('graph is disconnected');
      const out=[];
      let cur=b;
      let guard=0;
      while (cur!==a) {
        const p=prev[a][cur];
        if (!p) throw new Error(`missing predecessor from ${a} to ${b}`);
        out.push(p.edgeId);
        cur=p.from;
        if (++guard>graph.edges.length+n+5) throw new Error('predecessor cycle');
      }
      return out.reverse();
    }

    function solve(startId,endId) {
      if (!graph.vertices[startId] || !graph.vertices[endId]) throw new Error('invalid endpoint');
      const defects = new Set(originalOdd);
      if(startId!==endId){
        for (const id of [startId,endId]) {
          if (defects.has(id)) defects.delete(id); else defects.add(id);
        }
      }
      const defectIds=[...defects].sort((a,b)=>a-b);
      const matching = MinWeightPerfectMatching.solve(defectIds,(a,b)=>dist[a][b]);
      const duplicateCounts=Array(graph.edges.length).fill(0);
      for (const [a,b] of matching.pairs) {
        for (const edgeId of pathEdges(a,b)) duplicateCounts[edgeId]++;
      }

      const augAdj = Array.from({length:n},()=>[]);
      let copyId=0;
      const copyEdge=[];
      for (const e of graph.edges) {
        const count=1+duplicateCounts[e.id];
        for (let k=0;k<count;k++) {
          const c=copyId++;
          copyEdge[c]=e.id;
          augAdj[e.u].push({to:e.v,copyId:c,edgeId:e.id});
          augAdj[e.v].push({to:e.u,copyId:c,edgeId:e.id});
        }
      }
      for (const list of augAdj) list.sort((a,b)=>b.to-a.to || b.edgeId-a.edgeId || b.copyId-a.copyId);
      const usedCopy=new Set();
      const nodeStack=[startId];
      const edgeStack=[null];
      const reverseVertices=[];
      const reverseCopies=[];
      while (nodeStack.length) {
        const u=nodeStack[nodeStack.length-1];
        while (augAdj[u].length && usedCopy.has(augAdj[u][augAdj[u].length-1].copyId)) augAdj[u].pop();
        if (augAdj[u].length) {
          const a=augAdj[u].pop();
          if (usedCopy.has(a.copyId)) continue;
          usedCopy.add(a.copyId);
          nodeStack.push(a.to);
          edgeStack.push(a.copyId);
        } else {
          reverseVertices.push(nodeStack.pop());
          reverseCopies.push(edgeStack.pop());
        }
      }
      reverseVertices.reverse();
      reverseCopies.reverse();
      const vertexTrail=reverseVertices;
      const copyTrail=reverseCopies.slice(1);
      if (copyTrail.length !== copyId || vertexTrail[0]!==startId || vertexTrail.at(-1)!==endId) throw new Error('failed to construct endpoint Euler trail');
      const seenEdge=Array(graph.edges.length).fill(0);
      const traversals=[];
      for (let i=0;i<copyTrail.length;i++) {
        const edgeId=copyEdge[copyTrail[i]];
        const e=graph.edges[edgeId];
        const repeat=seenEdge[edgeId]>0;
        traversals.push({edgeId,from:vertexTrail[i],to:vertexTrail[i+1],repeat,shared:!!e.shared});
        seenEdge[edgeId]++;
      }
      const repeatCount=traversals.filter(t=>t.repeat).length;
      const repeatSharedCount=traversals.filter(t=>t.repeat && t.shared).length;
      return {vertexTrail,traversals,duplicateCounts,repeatCount,repeatSharedCount,totalSegmentCount:traversals.length,oddVertexIds:[...originalOdd],eulerWithoutRepeats:repeatCount===0};
    }

    return { solve, distances:dist, predecessors:prev, oddVertexIds:[...originalOdd], objective };
  }

  return { prepare, SHARED_PENALTY };
});
