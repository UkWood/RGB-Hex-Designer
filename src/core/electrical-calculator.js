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
  function validateInputs(input){
    const errors=[];
    const n={...input};
    n.moduleCount=num(input.moduleCount); n.uniqueEdgeCount=num(input.uniqueEdgeCount); n.repeatCount=num(input.repeatCount);
    n.sideMm=num(input.sideMm); n.ledPerM=num(input.ledPerM); n.wattsPerM=num(input.wattsPerM); n.voltage=num(input.voltage);
    n.reservePercent=input.reservePercent===undefined?20:num(input.reservePercent);
    for(const [k,v] of [['moduleCount',n.moduleCount],['uniqueEdgeCount',n.uniqueEdgeCount],['repeatCount',n.repeatCount]]){
      if(!Number.isFinite(v)||v<0) errors.push(`${k} must be finite and >= 0`);
    }
    for(const [k,v] of [['sideMm',n.sideMm],['ledPerM',n.ledPerM],['wattsPerM',n.wattsPerM]]){
      if(!Number.isFinite(v)||v<=0) errors.push(`${k} must be finite and > 0`);
    }
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
    const segmentM=n.sideMm/1000;
    const uniqueLengthM=n.uniqueEdgeCount*segmentM;
    const repeatLengthM=n.repeatCount*segmentM;
    const totalLengthM=uniqueLengthM+repeatLengthM;
    const ledCountApprox=Math.round(totalLengthM*n.ledPerM);
    const powerW=totalLengthM*n.wattsPerM;
    const currentA=powerW/n.voltage;
    const recommendedPsuW=powerW*(1+n.reservePercent/100);
    const repeatPercent=totalLengthM>0?repeatLengthM/totalLengthM*100:0;
    const dx=(input.endVertex.gx-input.startVertex.gx)*(Math.sqrt(3)/2)*n.sideMm/1000;
    const dy=(input.endVertex.gy-input.startVertex.gy)*0.5*n.sideMm/1000;
    const endpointSeparationM=Math.hypot(dx,dy);
    const segmentsPerSide=n.sideMm*n.ledPerM/1000;
    return {
      uniqueLengthM,repeatLengthM,totalLengthM,ledCountApprox,powerW,currentA,recommendedPsuW,repeatPercent,endpointSeparationM,
      segmentsPerSide,sideMm:n.sideMm,ledPerM:n.ledPerM,wattsPerM:n.wattsPerM,voltage:n.voltage,reservePercent:n.reservePercent
    };
  }
  return {calculate,validateInputs,sideMmFromSegments};
});
