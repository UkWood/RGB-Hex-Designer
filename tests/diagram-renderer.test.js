const test=require('node:test');
const assert=require('node:assert/strict');
const EditorState=require('../src/app/editor-state');
const DiagramRenderer=require('../src/core/diagram-renderer');

function fixture({closed=false,target=true}={}){
  const s=EditorState.create();
  for(const [q,r] of [[0,0],[1,0]])assert.equal(s.dispatch({type:'ADD_HEX',q,r}).ok,true);
  s.dispatch({type:'SET_PROJECT_NAME',value:'Проект PDF'});
  if(target){s.dispatch({type:'SET_REQUIRED_DIMENSION',field:'width',value:500});s.dispatch({type:'SET_REQUIRED_DIMENSION',field:'height',value:300});}
  s.dispatch({type:'SET_VIEW_FLAG',flag:'showEdgeNumbers',value:true});
  s.dispatch({type:'SET_VIEW_FLAG',flag:'showRouteNumbers',value:true});
  if(closed){const id=s.snapshot().boundary.lowerCandidateIds[0];s.dispatch({type:'SET_MANUAL_START',vertexId:id});s.dispatch({type:'SET_MANUAL_END',vertexId:id});}
  return s.snapshot();
}

test('diagram_is_inline_vector_svg_with_route_dynamic_numbers_and_dimension_frames',()=>{
  const snap=fixture();const svg=DiagramRenderer.render(snap);
  assert.match(svg,/^<svg\b/);assert.match(svg,/viewBox="[^"]+"/);
  assert.equal((svg.match(/data-hex=/g)||[]).length,snap.cells.length);
  assert.equal((svg.match(/data-edge-number=/g)||[]).length,snap.graph.edges.length);
  assert.ok((svg.match(/data-route=/g)||[]).length>=snap.graph.edges.length);
  assert.match(svg,/class="actual-frame"/);assert.match(svg,/class="target-frame"/);assert.match(svg,/#dc2626/);
  for(const n of Object.values(snap.numbering.hexNumberByKey))assert.match(svg,new RegExp(`data-hex-number="${n}"`));
  assert.doesNotMatch(svg,/(?:href|src)="https?:\/\//i);assert.doesNotMatch(svg,/<script\b|<image\b/i);
});

test('diagram_honors_number_visibility_flags',()=>{
  const snap=fixture();snap.view.showHexNumbers=false;snap.view.showEdgeNumbers=false;snap.view.showRouteNumbers=false;
  const svg=DiagramRenderer.render(snap);
  assert.doesNotMatch(svg,/data-hex-number=/);assert.doesNotMatch(svg,/data-edge-number=/);assert.doesNotMatch(svg,/data-route-number=/);
});

test('closed_route_draws_one_combined_start_end_marker',()=>{
  const svg=DiagramRenderer.render(fixture({closed:true}));
  assert.match(svg,/START \/ END/);assert.doesNotMatch(svg,/>START<\/text>[\s\S]*>END<\/text>/);
});

test('target_frame_is_absent_when_required_dimensions_are_incomplete',()=>{
  const snap=fixture({target:false});snap.requiredWidthMm=500;snap.requiredHeightMm=null;
  assert.doesNotMatch(DiagramRenderer.render(snap),/class="target-frame"/);
});

test('repeated_physical_edges_are_bright_red_and_twice_route_width_in_pdf_diagram',()=>{
  const snap=fixture({closed:true});
  const repeated=snap.numbering.specRows.filter(r=>r.additionalPasses>=1);
  assert.ok(repeated.length>0,'fixture must contain at least one repeated physical edge');
  const svg=DiagramRenderer.render(snap);
  assert.match(svg,/\.repeat-edge-highlight\{stroke:#ff0000;stroke-width:8;/);
  const highlighted=[...svg.matchAll(/data-repeat-edge="(\d+)"/g)].map(m=>Number(m[1])).sort((a,b)=>a-b);
  const expected=repeated.map(r=>r.edgeId).sort((a,b)=>a-b);
  assert.deepEqual(highlighted,expected);
});
