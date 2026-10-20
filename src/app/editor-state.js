(function(root,factory){
  const req=typeof module==='object'&&module.exports;
  const deps=req?{
    HexGrid:require('../core/hex-grid'),
    GeometryBuilder:require('../core/geometry-builder'),
    BoundaryAnalyzer:require('../core/boundary-analyzer'),
    RouteOptimizer:require('../core/route-optimizer'),
    EndpointSelector:require('../core/endpoint-selector'),
    ElectricalCalculator:require('../core/electrical-calculator'),
    ProjectIO:require('../core/project-io')
  }:{HexGrid:root.HexGrid,GeometryBuilder:root.GeometryBuilder,BoundaryAnalyzer:root.BoundaryAnalyzer,RouteOptimizer:root.RouteOptimizer,EndpointSelector:root.EndpointSelector,ElectricalCalculator:root.ElectricalCalculator,ProjectIO:root.ProjectIO};
  const api=factory(deps);
  if(req) module.exports=api; else root.EditorState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function({HexGrid,GeometryBuilder,BoundaryAnalyzer,RouteOptimizer,EndpointSelector,ElectricalCalculator,ProjectIO}){
  const clone=o=>JSON.parse(JSON.stringify(o));
  const cellKey=(q,r)=>`${q},${r}`;
  const defaults=()=>({
    cells:[],selectedKey:null,objective:'min_repeats',endpointMode:'auto',manualStart:null,manualEnd:null,
    strip:{sideMm:100,ledPerM:60,wattsPerM:18,voltage:12,reservePercent:20},
    view:{showNumbers:true,showDiagnostics:false,showRouteNumbers:false},
    graph:null,boundary:null,solution:null,electrical:null,startId:null,endId:null,ranking:null,warnings:[],undo:[],redo:[]
  });
  function create(){
    const st=defaults();

    function pushUndo(){ st.undo.push(clone(st.cells)); if(st.undo.length>100) st.undo.shift(); st.redo=[]; }
    function descFor(id){ if(id===null||id===undefined||!st.graph?.vertices[id]) return null; const v=st.graph.vertices[id]; return {gx:v.gx,gy:v.gy}; }
    function idFor(desc){ if(!desc) return null; const v=st.graph.vertices.find(v=>v.gx===desc.gx&&v.gy===desc.gy); return v?v.id:null; }
    function lexLess(a,b){for(let i=0;i<a.length;i++){if(a[i]!==b[i]) return a[i]<b[i];}return false;}
    function chooseWithFixed(prepared,fixedStart,fixedEnd){
      let best=null;
      const cands=st.boundary.lowerCandidateIds;
      if(fixedStart!==null&&fixedEnd!==null){
        const valid=EndpointSelector.validateManual(st.boundary,fixedStart,fixedEnd); if(!valid.ok) return null;
        const solution=prepared.solve(fixedStart,fixedEnd);
        return {startId:fixedStart,endId:fixedEnd,solution,ranking:EndpointSelector.rankTuple(solution,st.graph.vertices[fixedStart],st.graph.vertices[fixedEnd],st.strip.sideMm)};
      }
      const fixed=fixedStart!==null?fixedStart:fixedEnd;
      for(const other of cands){
        if(other===fixed) continue;
        const startId=fixedStart!==null?fixed:other, endId=fixedEnd!==null?fixed:other;
        const solution=prepared.solve(startId,endId);
        const rank=EndpointSelector.rankTuple(solution,st.graph.vertices[startId],st.graph.vertices[endId],st.strip.sideMm);
        if(!best||lexLess(rank,best.rank)) best={startId,endId,solution,rank};
      }
      return best&&{startId:best.startId,endId:best.endId,solution:best.solution,ranking:best.rank};
    }

    function recompute(extraWarnings=[]){
      st.warnings=[...extraWarnings];
      st.graph=GeometryBuilder.build(st.cells);
      st.boundary=BoundaryAnalyzer.analyze(st.graph);
      st.solution=null;st.electrical=null;st.startId=null;st.endId=null;st.ranking=null;
      if(st.graph.edges.length===0||st.boundary.lowerCandidateIds.length<2) return;
      const prepared=RouteOptimizer.prepare(st.graph,st.objective);
      let selected=null;
      if(st.endpointMode==='manual'){
        const ms=idFor(st.manualStart), me=idFor(st.manualEnd);
        let invalid=false;
        if(st.manualStart&&(ms===null||!st.boundary.lowerCandidateIds.includes(ms))) invalid=true;
        if(st.manualEnd&&(me===null||!st.boundary.lowerCandidateIds.includes(me))) invalid=true;
        if(ms!==null&&me!==null&&ms===me) invalid=true;
        if(invalid){
          st.endpointMode='auto'; st.manualStart=null; st.manualEnd=null;
          st.warnings.push('Manual endpoint is no longer on the valid lower boundary; routing returned to AUTO.');
        } else selected=chooseWithFixed(prepared,ms,me);
      }
      if(!selected){
        const auto=EndpointSelector.autoSelect(st.graph,st.boundary,prepared,st.strip.sideMm);
        selected={startId:auto.startId,endId:auto.endId,solution:auto.solution,ranking:auto.ranking};
      }
      st.startId=selected.startId;st.endId=selected.endId;st.solution=selected.solution;st.ranking=selected.ranking;
      const input={moduleCount:st.cells.length,uniqueEdgeCount:st.graph.edges.length,repeatCount:st.solution.repeatCount,sideMm:st.strip.sideMm,ledPerM:st.strip.ledPerM,wattsPerM:st.strip.wattsPerM,voltage:st.strip.voltage,reservePercent:st.strip.reservePercent,startVertex:st.graph.vertices[st.startId],endVertex:st.graph.vertices[st.endId]};
      const val=ElectricalCalculator.validateInputs(input);
      if(val.ok) st.electrical=ElectricalCalculator.calculate(input);
      else st.warnings.push(...val.errors);
    }

    function loadValidated(project){
      st.cells=project.hexagons.map(c=>({q:c.q,r:c.r}));
      st.selectedKey=null;st.objective=project.routing.objective;st.endpointMode=project.routing.endpoint_mode;
      st.manualStart=project.routing.start?{...project.routing.start}:null;st.manualEnd=project.routing.end?{...project.routing.end}:null;
      st.strip={sideMm:project.strip.side_mm,ledPerM:project.strip.led_per_m,wattsPerM:project.strip.watts_per_m,voltage:project.strip.voltage,reservePercent:project.strip.psu_reserve_percent};
      st.view={showNumbers:project.view.show_numbers,showDiagnostics:project.view.show_diagnostics,showRouteNumbers:false};
      st.undo=[];st.redo=[];
      recompute();
    }

    function dispatch(action){
      if(!action||typeof action.type!=='string') return {ok:false,message:'Invalid action'};
      switch(action.type){
        case 'ADD_HEX':{
          const grid=HexGrid.create(st.cells); const r=grid.add(action.q,action.r); if(!r.ok) return {ok:false,message:r.reason};
          pushUndo(); st.cells=grid.cloneCells(); st.selectedKey=cellKey(action.q,action.r); recompute(); return {ok:true};
        }
        case 'SELECT_HEX':{
          const k=action.key??cellKey(action.q,action.r); if(!st.cells.some(c=>cellKey(c.q,c.r)===k)) return {ok:false,message:'not_found'}; st.selectedKey=k; return {ok:true};
        }
        case 'DELETE_SELECTED':{
          if(!st.selectedKey) return {ok:false,message:'nothing_selected'}; const [q,r]=st.selectedKey.split(',').map(Number); const grid=HexGrid.create(st.cells); const res=grid.remove(q,r); if(!res.ok) return {ok:false,message:res.reason};
          pushUndo();st.cells=grid.cloneCells();st.selectedKey=null;recompute();return {ok:true};
        }
        case 'CLEAR':{
          if(!st.cells.length) return {ok:true}; pushUndo();st.cells=[];st.selectedKey=null;recompute();return {ok:true};
        }
        case 'UNDO':{
          if(!st.undo.length) return {ok:false,message:'nothing_to_undo'}; st.redo.push(clone(st.cells));st.cells=st.undo.pop();st.selectedKey=null;recompute();return {ok:true};
        }
        case 'REDO':{
          if(!st.redo.length) return {ok:false,message:'nothing_to_redo'};st.undo.push(clone(st.cells));st.cells=st.redo.pop();st.selectedKey=null;recompute();return {ok:true};
        }
        case 'SET_OBJECTIVE':{
          if(!['min_repeats','avoid_shared'].includes(action.objective)) return {ok:false,message:'invalid_objective'};st.objective=action.objective;recompute();return {ok:true};
        }
        case 'SET_ENDPOINT_MODE':{
          if(!['auto','manual'].includes(action.mode)) return {ok:false,message:'invalid_endpoint_mode'};st.endpointMode=action.mode;if(action.mode==='auto'){st.manualStart=null;st.manualEnd=null;}recompute();return {ok:true};
        }
        case 'RESET_AUTO':st.endpointMode='auto';st.manualStart=null;st.manualEnd=null;recompute();return {ok:true};
        case 'SET_MANUAL_START':{
          if(!st.boundary.lowerCandidateIds.includes(action.vertexId)) return {ok:false,message:'not_lower_boundary'}; const d=descFor(action.vertexId); const other=idFor(st.manualEnd);if(other===action.vertexId)return {ok:false,message:'same_endpoint'};st.manualStart=d;st.endpointMode='manual';recompute();return {ok:true};
        }
        case 'SET_MANUAL_END':{
          if(!st.boundary.lowerCandidateIds.includes(action.vertexId)) return {ok:false,message:'not_lower_boundary'}; const d=descFor(action.vertexId); const other=idFor(st.manualStart);if(other===action.vertexId)return {ok:false,message:'same_endpoint'};st.manualEnd=d;st.endpointMode='manual';recompute();return {ok:true};
        }
        case 'SET_STRIP_INPUT':{
          const f=action.field;const v=Number(action.value);const positive=['sideMm','ledPerM','wattsPerM'];
          if(positive.includes(f)){if(!Number.isFinite(v)||v<=0)return {ok:false,message:'invalid_numeric'};}
          else if(f==='reservePercent'){if(!Number.isFinite(v)||v<0)return {ok:false,message:'invalid_numeric'};}
          else if(f==='voltage'){if(![5,12,24].includes(v))return {ok:false,message:'invalid_voltage'};}
          else return {ok:false,message:'unknown_strip_field'};
          st.strip[f]=v;recompute();return {ok:true};
        }
        case 'SET_VIEW_FLAG':{
          if(!['showNumbers','showDiagnostics','showRouteNumbers'].includes(action.flag))return {ok:false,message:'unknown_view_flag'};st.view[action.flag]=!!action.value;return {ok:true};
        }
        case 'LOAD_PROJECT':{
          const parsed=ProjectIO.parse(JSON.stringify(action.project));if(!parsed.ok)return {ok:false,message:parsed.error};loadValidated(parsed.project);return {ok:true};
        }
        default:return {ok:false,message:'unknown_action'};
      }
    }

    function snapshot(){
      return clone({cells:st.cells,selectedKey:st.selectedKey,graph:st.graph,boundary:st.boundary,routing:{endpointMode:st.endpointMode,objective:st.objective,startId:st.startId,endId:st.endId,manualStart:st.manualStart,manualEnd:st.manualEnd,ranking:st.ranking},solution:st.solution,electrical:st.electrical,strip:st.strip,view:st.view,history:{undoCount:st.undo.length,redoCount:st.redo.length},warnings:st.warnings});
    }
    recompute();
    return {dispatch,snapshot};
  }
  return {create};
});
