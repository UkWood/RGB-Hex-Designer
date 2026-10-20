const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ProjectIO=require('../src/core/project-io');
const GeometryBuilder=require('../src/core/geometry-builder');
const BoundaryAnalyzer=require('../src/core/boundary-analyzer');
const RouteOptimizer=require('../src/core/route-optimizer');
const EndpointSelector=require('../src/core/endpoint-selector');

test('original_reference_configuration_loads_and_routes_continuously',()=>{
  const file=path.join(__dirname,'..','examples','reference-construction.json');
  const parsed=ProjectIO.parse(fs.readFileSync(file,'utf8'));
  assert.equal(parsed.ok,true,parsed.error);
  assert.equal(parsed.project.hexagons.length,8);
  const graph=GeometryBuilder.build(parsed.project.hexagons);
  const boundary=BoundaryAnalyzer.analyze(graph);
  assert.ok(graph.edges.length>0);
  assert.ok(boundary.lowerCandidateIds.length>=2);
  const prepared=RouteOptimizer.prepare(graph,parsed.project.routing.objective);
  const selected=EndpointSelector.autoSelect(graph,boundary,prepared,parsed.project.strip.side_mm);
  const trail=selected.solution;
  assert.equal(trail.vertexTrail[0],selected.startId);
  assert.equal(trail.vertexTrail.at(-1),selected.endId);
  const covered=new Set(trail.traversals.map(t=>t.edgeId));
  assert.equal(covered.size,graph.edges.length);
  for(let i=1;i<trail.traversals.length;i++) assert.equal(trail.traversals[i-1].to,trail.traversals[i].from);
});
