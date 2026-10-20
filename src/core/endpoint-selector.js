(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.EndpointSelector=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function world(v,side){ return {x:v.gx*(Math.sqrt(3)/2)*side,y:v.gy*0.5*side}; }
  function separation(a,b,side){ const A=world(a,side),B=world(b,side); return Math.hypot(A.x-B.x,A.y-B.y); }
  function rankTuple(solution,startVertex,endVertex,sideLength){
    return [solution.repeatCount,solution.repeatSharedCount,solution.totalSegmentCount*sideLength,-separation(startVertex,endVertex,sideLength)];
  }
  function lexLess(a,b){ for(let i=0;i<Math.max(a.length,b.length);i++){ if(a[i]!==b[i]) return a[i]<b[i]; } return false; }
  function validateManual(boundaryAnalysis,startId,endId){
    if(startId===endId) return {ok:false,reason:'same_endpoint'};
    const set=new Set(boundaryAnalysis.lowerCandidateIds);
    if(!set.has(startId)||!set.has(endId)) return {ok:false,reason:'not_lower_boundary'};
    return {ok:true};
  }
  function autoSelect(graph,boundaryAnalysis,preparedOptimizer,sideLength){
    const ids=[...boundaryAnalysis.lowerCandidateIds];
    if(ids.length<2) throw new Error('at least two lower endpoint candidates are required');
    let best=null;
    for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){
      const a=ids[i],b=ids[j];
      const sol=preparedOptimizer.solve(a,b);
      const rank=rankTuple(sol,graph.vertices[a],graph.vertices[b],sideLength);
      if(!best||lexLess(rank,best.rank)) best={a,b,sol,rank};
    }
    let startId=best.a,endId=best.b;
    const A=graph.vertices[startId],B=graph.vertices[endId];
    if(A.gx>B.gx||(A.gx===B.gx&&A.gy>B.gy)){ const t=startId;startId=endId;endId=t; }
    const solution=(startId===best.a&&endId===best.b)?best.sol:preparedOptimizer.solve(startId,endId);
    const ranking={repeatCount:solution.repeatCount,repeatSharedCount:solution.repeatSharedCount,totalLength:solution.totalSegmentCount*sideLength,separation:separation(graph.vertices[startId],graph.vertices[endId],sideLength)};
    return {startId,endId,solution,ranking};
  }
  return {autoSelect,validateManual,rankTuple};
});
