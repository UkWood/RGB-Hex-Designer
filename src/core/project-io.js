(function(root,factory){
  const CV=typeof module==='object'&&module.exports?require('./connectivity-validator'):root.ConnectivityValidator;
  const BA=typeof module==='object'&&module.exports?require('./boundary-analyzer'):root.BoundaryAnalyzer;
  const api=factory(CV,BA);
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.ProjectIO=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(ConnectivityValidator,BoundaryAnalyzer){
  'use strict';
  const V=2;
  const key=(q,r)=>`${q},${r}`;
  function finitePos(x){return Number.isFinite(x)&&x>0;}
  function endpointDescriptor(snapshot,id){
    if(id===null||id===undefined||!snapshot.graph||!snapshot.graph.vertices[id]) return null;
    const v=snapshot.graph.vertices[id]; return {gx:v.gx,gy:v.gy};
  }
  function serialize(snapshot){
    const cells=[...(snapshot.cells||[])].map(c=>({q:c.q,r:c.r})).sort((a,b)=>a.q-b.q||a.r-b.r);
    const routing=snapshot.routing||{}; const strip=snapshot.strip||{}; const view=snapshot.view||{};
    const mode=routing.endpointMode||routing.endpoint_mode||'auto';
    const hasManualStart=Object.prototype.hasOwnProperty.call(routing,'manualStart');
    const hasManualEnd=Object.prototype.hasOwnProperty.call(routing,'manualEnd');
    const startSource=hasManualStart?routing.manualStart:routing.start;
    const endSource=hasManualEnd?routing.manualEnd:routing.end;
    const start=mode==='manual'?(startSource&&Number.isInteger(startSource.gx)?{gx:startSource.gx,gy:startSource.gy}:(!hasManualStart?endpointDescriptor(snapshot,routing.startId):null)):null;
    const end=mode==='manual'?(endSource&&Number.isInteger(endSource.gx)?{gx:endSource.gx,gy:endSource.gy}:(!hasManualEnd?endpointDescriptor(snapshot,routing.endId):null)):null;
    const ledPerM=strip.ledPerM??strip.led_per_m??60;
    const legacySide=strip.sideMm??strip.side_mm??100;
    const segments=strip.segmentsPerSide??strip.segments_per_side??Math.max(1,Math.round(legacySide*ledPerM/1000));
    const project={
      version:V,
      hexagons:cells,
      layout:{orientation:snapshot.orientation==='flat'?'flat':'pointy'},
      routing:{endpoint_mode:mode,start,end,objective:routing.objective||'min_repeats'},
      strip:{
        segments_per_side:segments,
        led_per_m:ledPerM,
        watts_per_m:strip.wattsPerM??strip.watts_per_m??18,
        voltage:strip.voltage??12,
        psu_reserve_percent:strip.reservePercent??strip.psu_reserve_percent??20
      },
      view:{show_numbers:view.showNumbers??view.show_numbers??true,show_diagnostics:view.showDiagnostics??view.show_diagnostics??false}
    };
    return JSON.stringify(project,null,2);
  }
  function parse(jsonText){
    let p;
    try{p=JSON.parse(jsonText);}catch(e){return {ok:false,error:`Malformed JSON: ${e.message}`};}
    if(!p||typeof p!=='object'||Array.isArray(p)) return {ok:false,error:'Project must be an object'};
    if(![1,V].includes(p.version)) return {ok:false,error:`Unsupported project version ${String(p.version)}`};
    if(!Array.isArray(p.hexagons)) return {ok:false,error:'hexagons must be an array'};
    const cells=[]; const seen=new Set();
    for(const c of p.hexagons){
      if(!c||!Number.isInteger(c.q)||!Number.isInteger(c.r)) return {ok:false,error:'Axial q/r coordinates must be integers'};
      const k=key(c.q,c.r); if(seen.has(k)) return {ok:false,error:`Duplicate axial cell ${k}`}; seen.add(k); cells.push({q:c.q,r:c.r});
    }
    if(cells.length>1&&!ConnectivityValidator.isConnected(cells)) return {ok:false,error:'Hexagons must form one connected component'};
    const r=p.routing;
    if(!r||!['auto','manual'].includes(r.endpoint_mode)) return {ok:false,error:'routing.endpoint_mode must be auto or manual'};
    if(!['min_repeats','avoid_shared'].includes(r.objective)) return {ok:false,error:'Unsupported routing objective'};
    for(const name of ['start','end']){
      const d=r[name];
      if(d!==null&&d!==undefined&&(!d||!Number.isInteger(d.gx)||!Number.isInteger(d.gy))) return {ok:false,error:`routing.${name} must be null or integer {gx,gy}`};
    }
    const s=p.strip;
    if(!s) return {ok:false,error:'strip settings are required'};
    const warnings=[];
    let orientation='pointy',segmentsPerSide,ledPerM,wattsPerM,voltage,reservePercent;
    if(p.version===1){
      for(const name of ['side_mm','led_per_m','watts_per_m']) if(!finitePos(s[name])) return {ok:false,error:`strip.${name} must be finite and positive`};
      ledPerM=s.led_per_m; wattsPerM=s.watts_per_m; voltage=s.voltage; reservePercent=s.psu_reserve_percent;
      const raw=s.side_mm*ledPerM/1000;
      segmentsPerSide=Math.max(1,Math.round(raw));
      if(Math.abs(raw-segmentsPerSide)>1e-9) warnings.push(`Legacy side length corresponds to ${raw.toFixed(3)} LED cut segments; rounded to ${segmentsPerSide} segments per side.`);
    } else {
      const layout=p.layout||{};
      if(!['pointy','flat'].includes(layout.orientation)) return {ok:false,error:'layout.orientation must be pointy or flat'};
      orientation=layout.orientation;
      if(!Number.isInteger(s.segments_per_side)||s.segments_per_side<=0) return {ok:false,error:'strip.segments_per_side must be a positive integer'};
      if(!finitePos(s.led_per_m)) return {ok:false,error:'strip.led_per_m must be finite and positive'};
      if(!finitePos(s.watts_per_m)) return {ok:false,error:'strip.watts_per_m must be finite and positive'};
      segmentsPerSide=s.segments_per_side; ledPerM=s.led_per_m; wattsPerM=s.watts_per_m; voltage=s.voltage; reservePercent=s.psu_reserve_percent;
    }
    if(![5,12,24].includes(voltage)) return {ok:false,error:'strip.voltage must be 5, 12, or 24'};
    if(!Number.isFinite(reservePercent)||reservePercent<0) return {ok:false,error:'strip.psu_reserve_percent must be finite and >= 0'};
    const view=p.view||{};
    if(typeof view.show_numbers!=='boolean'||typeof view.show_diagnostics!=='boolean') return {ok:false,error:'view flags must be boolean'};
    const project={
      version:V,
      hexagons:cells.sort((a,b)=>a.q-b.q||a.r-b.r),
      layout:{orientation},
      routing:{endpoint_mode:r.endpoint_mode,start:r.start??null,end:r.end??null,objective:r.objective},
      strip:{segments_per_side:segmentsPerSide,led_per_m:ledPerM,watts_per_m:wattsPerM,voltage,psu_reserve_percent:reservePercent},
      view:{show_numbers:view.show_numbers,show_diagnostics:view.show_diagnostics}
    };
    return {ok:true,project,warnings};
  }
  function resolveManualEndpoints(project,graph,boundaryAnalysis){
    if(!project.routing||project.routing.endpoint_mode!=='manual') return {mode:'auto',startId:null,endId:null,warnings:[]};
    const byKey=new Map(graph.vertices.map(v=>[`${v.gx},${v.gy}`,v.id]));
    const warnings=[];
    function resolve(d){return d?byKey.get(`${d.gx},${d.gy}`):null;}
    const startId=resolve(project.routing.start),endId=resolve(project.routing.end);
    const descriptors=[['START',project.routing.start,startId],['END',project.routing.end,endId]];
    for(const [label,desc,id] of descriptors){
      if(desc!==null&&desc!==undefined&&(id===undefined||!BoundaryAnalyzer.isValidLowerEndpoint(boundaryAnalysis,id))) warnings.push(`${label} endpoint is no longer on the valid lower boundary`);
    }
    if(startId!==null&&startId!==undefined&&endId!==null&&endId!==undefined&&startId===endId) warnings.push('START and END must be different');
    if(warnings.length) return {mode:'auto',startId:null,endId:null,warnings};
    return {mode:'manual',startId:startId??null,endId:endId??null,warnings:[]};
  }
  return {serialize,parse,resolveManualEndpoints,version:V};
});
