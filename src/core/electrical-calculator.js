(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.ElectricalCalculator=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const allowedVoltages=new Set([5,12,24]);
  function num(v){ return typeof v==='number'?v:Number(v); }
  function sideMmFromSegments(segmentsPerSide,ledPerM){
    const segments=num(segmentsPerSide), density=num(ledPerM);
    if(!Number.isInteger(segments)||segments<=0) throw new Error('segmentsPerSide must be a positive integer');
    if(!Number.isFinite(density)||density<=0) throw new Error('ledPerM must be finite and > 0');
    return segments*1000/density;
  }
  function edgeLengthsFromSegments(segmentsPerEdge,ledPerM,edgeCorrectionMm=0){
    const segments=num(segmentsPerEdge),density=num(ledPerM),correction=num(edgeCorrectionMm);
    if(!Number.isInteger(segments)||segments<=0) throw new Error('segmentsPerEdge must be a positive integer');
    if(!Number.isFinite(density)||density<=0) throw new Error('ledPerM must be finite and > 0');
    if(!Number.isFinite(correction)) throw new Error('edgeCorrectionMm must be finite');
    const baseEdgeMm=segments*1000/density;
    const edgeMm=baseEdgeMm+correction;
    if(!Number.isFinite(edgeMm)||edgeMm<=0) throw new Error('edgeMm must be finite and > 0');
    return {baseEdgeMm,edgeMm};
  }
  function validateInputs(input){
    const errors=[];
    const n={...input};
    n.moduleCount=num(input.moduleCount); n.uniqueEdgeCount=num(input.uniqueEdgeCount); n.repeatCount=num(input.repeatCount);
    n.edgeMm=num(input.edgeMm===undefined?input.sideMm:input.edgeMm);
    n.sideMm=n.edgeMm;
    n.ledPerM=num(input.ledPerM); n.wattsPerM=num(input.wattsPerM); n.voltage=num(input.voltage);
    n.reservePercent=input.reservePercent===undefined?20:num(input.reservePercent);
    n.segmentsPerEdge=input.segmentsPerEdge===undefined?undefined:num(input.segmentsPerEdge);
    n.baseEdgeMm=input.baseEdgeMm===undefined?undefined:num(input.baseEdgeMm);
    n.edgeCorrectionMm=input.edgeCorrectionMm===undefined?0:num(input.edgeCorrectionMm);
    for(const [k,v] of [['moduleCount',n.moduleCount],['uniqueEdgeCount',n.uniqueEdgeCount],['repeatCount',n.repeatCount]]){
      if(!Number.isFinite(v)||v<0) errors.push(`${k} must be finite and >= 0`);
    }
    for(const [k,v] of [['edgeMm',n.edgeMm],['ledPerM',n.ledPerM],['wattsPerM',n.wattsPerM]]){
      if(!Number.isFinite(v)||v<=0) errors.push(`${k} must be finite and > 0`);
    }
    if(n.segmentsPerEdge!==undefined&&(!Number.isInteger(n.segmentsPerEdge)||n.segmentsPerEdge<=0)) errors.push('segmentsPerEdge must be a positive integer');
    if(n.baseEdgeMm!==undefined&&(!Number.isFinite(n.baseEdgeMm)||n.baseEdgeMm<=0)) errors.push('baseEdgeMm must be finite and > 0');
    if(!Number.isFinite(n.edgeCorrectionMm)) errors.push('edgeCorrectionMm must be finite');
    if(!allowedVoltages.has(n.voltage)) errors.push('voltage must be 5, 12, or 24');
    if(!Number.isFinite(n.reservePercent)||n.reservePercent<0) errors.push('reservePercent must be finite and >= 0');
    const validVertex=(v)=>v&&Number.isFinite(v.gx)&&Number.isFinite(v.gy);
    if(!validVertex(input.startVertex)||!validVertex(input.endVertex)) errors.push('valid startVertex and endVertex are required');
    return errors.length?{ok:false,errors}:{ok:true,errors:[],normalized:n};
  }
  function calculate(input){
    const v=validateInputs(input);
    if(!v.ok) throw new Error(v.errors.join('; '));
    const n=v.normalized;
    const segmentM=n.edgeMm/1000;
    const uniqueLengthM=n.uniqueEdgeCount*segmentM;
    const repeatLengthM=n.repeatCount*segmentM;
    const totalLengthM=uniqueLengthM+repeatLengthM;
    const ledCountApprox=Math.round(totalLengthM*n.ledPerM);
    const powerW=totalLengthM*n.wattsPerM;
    const currentA=powerW/n.voltage;
    const recommendedPsuW=powerW*(1+n.reservePercent/100);
    const repeatPercent=totalLengthM>0?repeatLengthM/totalLengthM*100:0;
    const dx=(input.endVertex.gx-input.startVertex.gx)*(Math.sqrt(3)/2)*n.edgeMm/1000;
    const dy=(input.endVertex.gy-input.startVertex.gy)*0.5*n.edgeMm/1000;
    const endpointSeparationM=Math.hypot(dx,dy);
    const segmentsPerEdge=n.segmentsPerEdge===undefined?n.edgeMm*n.ledPerM/1000:n.segmentsPerEdge;
    const baseEdgeMm=n.baseEdgeMm===undefined?segmentsPerEdge*1000/n.ledPerM:n.baseEdgeMm;
    const edgeCorrectionMm=n.edgeCorrectionMm;
    return {
      uniqueLengthM,repeatLengthM,totalLengthM,ledCountApprox,powerW,currentA,recommendedPsuW,repeatPercent,endpointSeparationM,
      segmentsPerEdge,baseEdgeMm,edgeCorrectionMm,edgeMm:n.edgeMm,
      segmentsPerSide:segmentsPerEdge,sideMm:n.edgeMm,
      ledPerM:n.ledPerM,wattsPerM:n.wattsPerM,voltage:n.voltage,reservePercent:n.reservePercent
    };
  }
  return {calculate,validateInputs,sideMmFromSegments,edgeLengthsFromSegments};
});
