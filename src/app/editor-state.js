(function(root,factory){
  const req=typeof module==='object'&&module.exports;
  const deps=req?{
    HexGrid:require('../core/hex-grid'),GeometryBuilder:require('../core/geometry-builder'),BoundaryAnalyzer:require('../core/boundary-analyzer'),RouteOptimizer:require('../core/route-optimizer'),EndpointSelector:require('../core/endpoint-selector'),ElectricalCalculator:require('../core/electrical-calculator'),ProjectIO:require('../core/project-io'),DisplayNumbering:require('../core/display-numbering')
  }:{HexGrid:root.HexGrid,GeometryBuilder:root.GeometryBuilder,BoundaryAnalyzer:root.BoundaryAnalyzer,RouteOptimizer:root.RouteOptimizer,EndpointSelector:root.EndpointSelector,ElectricalCalculator:root.ElectricalCalculator,ProjectIO:root.ProjectIO,DisplayNumbering:root.DisplayNumbering};
  const api=factory(deps);if(req)module.exports=api;else root.EditorState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function({HexGrid,GeometryBuilder,BoundaryAnalyzer,RouteOptimizer,EndpointSelector,ElectricalCalculator,ProjectIO,DisplayNumbering}){
  const clone=o=>JSON.parse(JSON.stringify(o));
  const defaults=()=>({
    projectName:'',requiredWidthMm:null,requiredHeightMm:null,cells:[],orientation:'pointy',objective:'min_repeats',endpointMode:'auto',manualStart:null,manualEnd:null,
    strip:{segmentsPerEdge:6,baseEdgeMm:100,edgeCorrectionMm:0,edgeMm:100,segmentsPerSide:6,sideMm:100,ledPerM:60,wattsPerM:18,voltage:12,reservePercent:20},
    view:{showHexNumbers:true,showEdgeNumbers:true,showRouteNumbers:false,showDiagnostics:false,showNumbers:true},
    graph:null,boundary:null,solution:null,electrical:null,numbering:null,startId:null,endId:null,ranking:null,warnings:[],undo:[],redo:[]
  });
  function create(){
    const st=defaults();
    function syncEdge(){const d=ElectricalCalculator.edgeLengthsFromSegments(st.strip.segmentsPerEdge,st.strip.ledPerM,st.strip.edgeCorrectionMm);st.strip.baseEdgeMm=d.baseEdgeMm;st.strip.edgeMm=d.edgeMm;st.strip.segmentsPerSide=st.strip.segmentsPerEdge;st.strip.sideMm=d.edgeMm;}
    function pushUndo(){st.undo.push(clone(st.cells));if(st.undo.length>100)st.undo.shift();st.redo=[];}
    function descFor(id){if(id===null||id===undefined||!st.graph?.vertices[id])return null;const v=st.graph.vertices[id];return {gx:v.gx,gy:v.gy};}
    function idFor(desc){if(!desc)return null;const v=st.graph.vertices.find(v=>v.gx===desc.gx&&v.gy===desc.gy);return v?v.id:null;}
    function lexLess(a,b){for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]<b[i];}return false;}
    function chooseWithFixed(prepared,fixedStart,fixedEnd){
      let best=null;const cands=st.boundary.lowerCandidateIds;
      if(fixedStart!==null&&fixedEnd!==null){const valid=EndpointSelector.validateManual(st.boundary,fixedStart,fixedEnd);if(!valid.ok)return null;const solution=prepared.solve(fixedStart,fixedEnd);return {startId:fixedStart,endId:fixedEnd,solution,ranking:EndpointSelector.rankTuple(solution,st.graph.vertices[fixedStart],st.graph.vertices[fixedEnd],st.strip.edgeMm)};}
      const fixed=fixedStart!==null?fixedStart:fixedEnd;
      for(const other of cands){if(other===fixed)continue;const startId=fixedStart!==null?fixed:other,endId=fixedEnd!==null?fixed:other;const solution=prepared.solve(startId,endId);const rank=EndpointSelector.rankTuple(solution,st.graph.vertices[startId],st.graph.vertices[endId],st.strip.edgeMm);if(!best||lexLess(rank,best.rank))best={startId,endId,solution,rank};}
      return best&&{startId:best.startId,endId:best.endId,solution:best.solution,ranking:best.rank};
    }
    function recompute(extraWarnings=[]){
      st.warnings=[...extraWarnings];syncEdge();st.graph=GeometryBuilder.build(st.cells);st.boundary=BoundaryAnalyzer.analyze(st.graph,st.orientation);
      st.solution=null;st.electrical=null;st.numbering=null;st.startId=null;st.endId=null;st.ranking=null;
      if(st.graph.edges.length===0||st.boundary.lowerCandidateIds.length<2)return;
      const prepared=RouteOptimizer.prepare(st.graph,st.objective);let selected=null;
      if(st.endpointMode==='manual'){
        const ms=idFor(st.manualStart),me=idFor(st.manualEnd);let invalid=false;
        if(st.manualStart&&(ms===null||!st.boundary.lowerCandidateIds.includes(ms)))invalid=true;
        if(st.manualEnd&&(me===null||!st.boundary.lowerCandidateIds.includes(me)))invalid=true;
        if(invalid){st.endpointMode='auto';st.manualStart=null;st.manualEnd=null;st.warnings.push('Manual endpoint is no longer on the valid lower boundary; routing returned to AUTO.');}else selected=chooseWithFixed(prepared,ms,me);
      }
      if(!selected){const auto=EndpointSelector.autoSelect(st.graph,st.boundary,prepared,st.strip.edgeMm,st.orientation);selected={startId:auto.startId,endId:auto.endId,solution:auto.solution,ranking:auto.ranking};}
      st.startId=selected.startId;st.endId=selected.endId;st.solution=selected.solution;st.ranking=selected.ranking;
      const input={moduleCount:st.cells.length,uniqueEdgeCount:st.graph.edges.length,repeatCount:st.solution.repeatCount,segmentsPerEdge:st.strip.segmentsPerEdge,baseEdgeMm:st.strip.baseEdgeMm,edgeCorrectionMm:st.strip.edgeCorrectionMm,edgeMm:st.strip.edgeMm,ledPerM:st.strip.ledPerM,wattsPerM:st.strip.wattsPerM,voltage:st.strip.voltage,reservePercent:st.strip.reservePercent,startVertex:st.graph.vertices[st.startId],endVertex:st.graph.vertices[st.endId],orientation:st.orientation};
      const val=ElectricalCalculator.validateInputs(input);if(val.ok)st.electrical=ElectricalCalculator.calculate(input);else st.warnings.push(...val.errors);
      st.numbering=DisplayNumbering.derive({graph:st.graph,solution:st.solution,startId:st.startId,orientation:st.orientation,edgeMm:st.strip.edgeMm});
    }
    function loadValidated(project,extraWarnings=[]){
      st.projectName=project.project?.name||'';st.requiredWidthMm=project.layout?.required_width_mm??null;st.requiredHeightMm=project.layout?.required_height_mm??null;
      st.cells=project.hexagons.map(c=>({q:c.q,r:c.r}));st.orientation=project.layout?.orientation==='flat'?'flat':'pointy';st.objective=project.routing.objective;st.endpointMode=project.routing.endpoint_mode;
      st.manualStart=project.routing.start?{...project.routing.start}:null;st.manualEnd=project.routing.end?{...project.routing.end}:null;
      st.strip={segmentsPerEdge:project.strip.segments_per_edge,baseEdgeMm:0,edgeCorrectionMm:project.strip.edge_correction_mm,edgeMm:0,segmentsPerSide:project.strip.segments_per_edge,sideMm:0,ledPerM:project.strip.led_per_m,wattsPerM:project.strip.watts_per_m,voltage:project.strip.voltage,reservePercent:project.strip.psu_reserve_percent};syncEdge();
      st.view={showHexNumbers:project.view.show_hex_numbers,showEdgeNumbers:project.view.show_edge_numbers,showRouteNumbers:project.view.show_route_numbers,showDiagnostics:project.view.show_diagnostics,showNumbers:project.view.show_hex_numbers};st.undo=[];st.redo=[];recompute(extraWarnings);
    }
    function dispatch(action){
      if(!action||typeof action.type!=='string')return {ok:false,message:'Invalid action'};
      switch(action.type){
        case 'ADD_HEX':{const grid=HexGrid.create(st.cells),r=grid.add(action.q,action.r);if(!r.ok)return {ok:false,message:r.reason};pushUndo();st.cells=grid.cloneCells();recompute();return {ok:true};}
        case 'DELETE_HEX':{let q=action.q,r=action.r;if(action.key!==undefined){const parts=String(action.key).split(',').map(Number);q=parts[0];r=parts[1];}if(!Number.isInteger(q)||!Number.isInteger(r))return {ok:false,message:'invalid_coordinates'};const grid=HexGrid.create(st.cells),res=grid.remove(q,r);if(!res.ok)return {ok:false,message:res.reason};pushUndo();st.cells=grid.cloneCells();recompute();return {ok:true};}
        case 'SELECT_HEX':case 'DELETE_SELECTED':return {ok:false,message:'selection_disabled'};
        case 'CLEAR':if(!st.cells.length)return {ok:true};pushUndo();st.cells=[];recompute();return {ok:true};
        case 'UNDO':if(!st.undo.length)return {ok:false,message:'nothing_to_undo'};st.redo.push(clone(st.cells));st.cells=st.undo.pop();recompute();return {ok:true};
        case 'REDO':if(!st.redo.length)return {ok:false,message:'nothing_to_redo'};st.undo.push(clone(st.cells));st.cells=st.redo.pop();recompute();return {ok:true};
        case 'SET_PROJECT_NAME':st.projectName=String(action.value??'');return {ok:true};
        case 'SET_REQUIRED_DIMENSION':{if(!['width','height'].includes(action.field))return {ok:false,message:'unknown_dimension'};const empty=action.value===null||action.value===undefined||action.value==='';const v=empty?null:Number(action.value);if(v!==null&&(!Number.isFinite(v)||v<=0))return {ok:false,message:'invalid_numeric'};if(action.field==='width')st.requiredWidthMm=v;else st.requiredHeightMm=v;return {ok:true};}
        case 'SET_ORIENTATION':if(!['pointy','flat'].includes(action.orientation))return {ok:false,message:'invalid_orientation'};if(st.orientation===action.orientation)return {ok:true};st.orientation=action.orientation;recompute();return {ok:true};
        case 'SET_OBJECTIVE':if(!['min_repeats','avoid_shared'].includes(action.objective))return {ok:false,message:'invalid_objective'};st.objective=action.objective;recompute();return {ok:true};
        case 'SET_ENDPOINT_MODE':if(!['auto','manual'].includes(action.mode))return {ok:false,message:'invalid_endpoint_mode'};st.endpointMode=action.mode;if(action.mode==='auto'){st.manualStart=null;st.manualEnd=null;}recompute();return {ok:true};
        case 'RESET_AUTO':st.endpointMode='auto';st.manualStart=null;st.manualEnd=null;recompute();return {ok:true};
        case 'SET_MANUAL_START':{if(!st.boundary.lowerCandidateIds.includes(action.vertexId))return {ok:false,message:'not_lower_boundary'};st.manualStart=descFor(action.vertexId);st.endpointMode='manual';recompute();return {ok:true};}
        case 'SET_MANUAL_END':{if(!st.boundary.lowerCandidateIds.includes(action.vertexId))return {ok:false,message:'not_lower_boundary'};st.manualEnd=descFor(action.vertexId);st.endpointMode='manual';recompute();return {ok:true};}
        case 'SET_STRIP_INPUT':{
          let f=action.field;if(f==='segmentsPerSide')f='segmentsPerEdge';const v=Number(action.value);
          if(f==='segmentsPerEdge'){if(!Number.isInteger(v)||v<=0)return {ok:false,message:'invalid_numeric'};}
          else if(['ledPerM','wattsPerM'].includes(f)){if(!Number.isFinite(v)||v<=0)return {ok:false,message:'invalid_numeric'};}
          else if(f==='edgeCorrectionMm'){if(!Number.isFinite(v))return {ok:false,message:'invalid_numeric'};}
          else if(f==='reservePercent'){if(!Number.isFinite(v)||v<0)return {ok:false,message:'invalid_numeric'};}
          else if(f==='voltage'){if(![5,12,24].includes(v))return {ok:false,message:'invalid_voltage'};}
          else return {ok:false,message:'unknown_strip_field'};
          const candidate={...st.strip,[f]:v};try{ElectricalCalculator.edgeLengthsFromSegments(candidate.segmentsPerEdge,candidate.ledPerM,candidate.edgeCorrectionMm);}catch{return {ok:false,message:'invalid_numeric'};}
          st.strip[f]=v;syncEdge();recompute();return {ok:true};
        }
        case 'SET_VIEW_FLAG':{let flag=action.flag;if(flag==='showNumbers')flag='showHexNumbers';if(!['showHexNumbers','showEdgeNumbers','showDiagnostics','showRouteNumbers'].includes(flag))return {ok:false,message:'unknown_view_flag'};st.view[flag]=!!action.value;if(flag==='showHexNumbers')st.view.showNumbers=st.view.showHexNumbers;return {ok:true};}
        case 'LOAD_PROJECT':{const parsed=ProjectIO.parse(JSON.stringify(action.project));if(!parsed.ok)return {ok:false,message:parsed.error};loadValidated(parsed.project,parsed.warnings);return {ok:true};}
        default:return {ok:false,message:'unknown_action'};
      }
    }
    function snapshot(){return clone({projectName:st.projectName,requiredWidthMm:st.requiredWidthMm,requiredHeightMm:st.requiredHeightMm,cells:st.cells,orientation:st.orientation,graph:st.graph,boundary:st.boundary,routing:{endpointMode:st.endpointMode,objective:st.objective,startId:st.startId,endId:st.endId,manualStart:st.manualStart,manualEnd:st.manualEnd,ranking:st.ranking},solution:st.solution,electrical:st.electrical,numbering:st.numbering,strip:st.strip,view:st.view,history:{undoCount:st.undo.length,redoCount:st.redo.length},warnings:st.warnings});}
    recompute();return {dispatch,snapshot};
  }
  return {create};
});
