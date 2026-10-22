(function(root,factory){
  const GB=typeof module==='object'&&module.exports?require('./geometry-builder'):root.GeometryBuilder;
  const api=factory(GB);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.DisplayNumbering=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(GeometryBuilder){
  'use strict';
  function derive({graph,solution,startId,orientation='pointy',edgeMm=1}){
    const edgeNumberById={},traversalCountByEdgeId={},firstEdgeIndex=new Map();
    const traversals=solution&&Array.isArray(solution.traversals)?solution.traversals:[];
    let nextEdgeNumber=1;
    traversals.forEach((t,index)=>{
      traversalCountByEdgeId[t.edgeId]=(traversalCountByEdgeId[t.edgeId]||0)+1;
      if(!firstEdgeIndex.has(t.edgeId)){
        firstEdgeIndex.set(t.edgeId,index);
        edgeNumberById[t.edgeId]=nextEdgeNumber++;
      }
    });
    for(const e of graph.edges){
      if(edgeNumberById[e.id]===undefined)edgeNumberById[e.id]=nextEdgeNumber++;
      if(traversalCountByEdgeId[e.id]===undefined)traversalCountByEdgeId[e.id]=0;
    }

    const adj=Array.from({length:graph.vertices.length},()=>[]);
    for(const e of graph.edges){adj[e.u].push(e.v);adj[e.v].push(e.u);}
    const dist=Array(graph.vertices.length).fill(Infinity);
    if(Number.isInteger(startId)&&graph.vertices[startId]){
      dist[startId]=0;const queue=[startId];let qi=0;
      while(qi<queue.length){const u=queue[qi++];for(const v of adj[u])if(!Number.isFinite(dist[v])){dist[v]=dist[u]+1;queue.push(v);}}
    }

    const firstRouteByModule=new Map();
    traversals.forEach((t,index)=>{
      const edge=graph.edges[t.edgeId];
      for(const key of edge?.moduleKeys||[])if(!firstRouteByModule.has(key))firstRouteByModule.set(key,index);
    });
    const hexMetaByKey={};
    for(const m of graph.modules){
      const pts=m.vertexIds.map(id=>GeometryBuilder.toWorld(graph.vertices[id],edgeMm,orientation));
      const centerX=pts.reduce((s,p)=>s+p.x,0)/pts.length;
      const centerY=pts.reduce((s,p)=>s+p.y,0)/pts.length;
      hexMetaByKey[m.key]={
        distance:Math.min(...m.vertexIds.map(id=>dist[id])),
        firstRouteIndex:firstRouteByModule.has(m.key)?firstRouteByModule.get(m.key):Infinity,
        centerX,centerY
      };
    }
    const orderedModules=[...graph.modules].sort((a,b)=>{
      const A=hexMetaByKey[a.key],B=hexMetaByKey[b.key];
      return A.distance-B.distance||A.firstRouteIndex-B.firstRouteIndex||A.centerY-B.centerY||A.centerX-B.centerX||a.key.localeCompare(b.key);
    });
    const hexNumberByKey={};orderedModules.forEach((m,i)=>{hexNumberByKey[m.key]=i+1;});
    const specRows=graph.edges.map(e=>({edgeId:e.id,number:edgeNumberById[e.id],additionalPasses:Math.max(0,(traversalCountByEdgeId[e.id]||0)-1)})).sort((a,b)=>a.number-b.number);
    return {edgeNumberById,hexNumberByKey,traversalCountByEdgeId,specRows,hexMetaByKey};
  }
  return {derive};
});
