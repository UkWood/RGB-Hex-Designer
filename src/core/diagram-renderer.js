(function(root,factory){
  const GB=typeof module==='object'&&module.exports?require('./geometry-builder'):root.GeometryBuilder;
  const api=factory(GB);if(typeof module==='object'&&module.exports)module.exports=api;else root.DiagramRenderer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(GeometryBuilder){
  'use strict';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Number.isFinite(Number(n))?String(Math.round(Number(n)*100)/100):'—';
  function moduleCenter(module,points){const ps=module.vertexIds.map(id=>points[id]);return {x:ps.reduce((s,p)=>s+p.x,0)/ps.length,y:ps.reduce((s,p)=>s+p.y,0)/ps.length};}
  function targetBounds(bounds,w,h){const cx=(bounds.minX+bounds.maxX)/2,cy=(bounds.minY+bounds.maxY)/2;return {minX:cx-w/2,maxX:cx+w/2,minY:cy-h/2,maxY:cy+h/2,width:w,height:h};}
  function dimensionMarkup(cls,prefix,b,color){const cx=(b.minX+b.maxX)/2,cy=(b.minY+b.maxY)/2,off=Math.max(14,Math.min(b.width,b.height)*.04);return `<rect class="${cls}" x="${fmt(b.minX)}" y="${fmt(b.minY)}" width="${fmt(b.width)}" height="${fmt(b.height)}"/>`+
    `<text class="dimension-label" data-dimension="${prefix}-width-top" x="${fmt(cx)}" y="${fmt(b.minY-off)}" text-anchor="middle">${fmt(b.width)} мм</text>`+
    `<text class="dimension-label" data-dimension="${prefix}-width-bottom" x="${fmt(cx)}" y="${fmt(b.maxY+off)}" text-anchor="middle">${fmt(b.width)} мм</text>`+
    `<text class="dimension-label" data-dimension="${prefix}-height-left" x="${fmt(b.minX-off)}" y="${fmt(cy)}" text-anchor="middle">${fmt(b.height)} мм</text>`+
    `<text class="dimension-label" data-dimension="${prefix}-height-right" x="${fmt(b.maxX+off)}" y="${fmt(cy)}" text-anchor="middle">${fmt(b.height)} мм</text>`;}
  function render(snapshot){
    const graph=snapshot?.graph,solution=snapshot?.solution;if(!graph||!solution||!graph.vertices.length)return '<svg viewBox="0 0 100 100" role="img" aria-label="Пустая схема"></svg>';
    const edgeMm=Number(snapshot.strip?.edgeMm??snapshot.strip?.sideMm)||100,orientation=snapshot.orientation||'pointy';
    const points=graph.vertices.map(v=>GeometryBuilder.toWorld(v,edgeMm,orientation)),actual=GeometryBuilder.worldBounds(graph,edgeMm,orientation);
    const rw=Number(snapshot.requiredWidthMm),rh=Number(snapshot.requiredHeightMm),target=Number.isFinite(rw)&&rw>0&&Number.isFinite(rh)&&rh>0?targetBounds(actual,rw,rh):null;
    const combined={minX:target?Math.min(actual.minX,target.minX):actual.minX,maxX:target?Math.max(actual.maxX,target.maxX):actual.maxX,minY:target?Math.min(actual.minY,target.minY):actual.minY,maxY:target?Math.max(actual.maxY,target.maxY):actual.maxY};
    const margin=Math.max(55,edgeMm*.55);combined.minX-=margin;combined.maxX+=margin;combined.minY-=margin;combined.maxY+=margin;
    const width=combined.maxX-combined.minX,height=combined.maxY-combined.minY,font=Math.max(10,Math.min(16,edgeMm*.13)),r=Math.max(5,edgeMm*.055);
    const out=[];out.push(`<svg viewBox="${fmt(combined.minX)} ${fmt(combined.minY)} ${fmt(width)} ${fmt(height)}" role="img" aria-label="Схема трассировки">`);
    out.push(`<defs><marker id="print-arrow" markerWidth="4" markerHeight="4" refX="3.5" refY="1.5" orient="auto"><path d="M0,0 L0,3 L4,1.5 z" fill="#2563eb"/></marker></defs>`);
    out.push(`<style>.hex{fill:none;stroke:#6b7280;stroke-width:1.5}.corridor{stroke:#d1d5db;stroke-width:10;stroke-linecap:round}.route{stroke:#2563eb;stroke-width:4;stroke-linecap:round}.route.repeat{stroke:#d97706;stroke-dasharray:9 6}.actual-frame{fill:none;stroke:#9ca3af;stroke-width:1}.target-frame{fill:none;stroke:#dc2626;stroke-width:1.2}.dimension-label,.hex-number,.edge-number,.route-number,.endpoint{font-family:Arial,sans-serif;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round;dominant-baseline:middle}.dimension-label{font-size:${font}px;fill:#6b7280;font-weight:700}.hex-number{font-size:${font}px;fill:#374151;font-weight:800}.edge-number{font-size:${Math.max(9,font-1)}px;fill:#1d4ed8;font-weight:800}.route-number{font-size:${Math.max(8,font-2)}px;fill:#111827}.endpoint{font-size:${font}px;font-weight:800;fill:#111827}</style>`);
    out.push(dimensionMarkup('actual-frame','actual',actual,'#9ca3af'));if(target)out.push(dimensionMarkup('target-frame','target',target,'#dc2626'));
    for(const e of graph.edges){const a=points[e.u],b=points[e.v];out.push(`<line class="corridor" x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}"/>`);}
    for(const m of graph.modules){const polygon=m.vertexIds.map(id=>`${fmt(points[id].x)},${fmt(points[id].y)}`).join(' ');out.push(`<polygon class="hex" data-hex="${esc(m.key)}" points="${polygon}"/>`);if(snapshot.view?.showHexNumbers){const c=moduleCenter(m,points),n=snapshot.numbering?.hexNumberByKey?.[m.key];out.push(`<text class="hex-number" data-hex-number="${n}" x="${fmt(c.x)}" y="${fmt(c.y)}" text-anchor="middle">${n}</text>`);}}
    solution.traversals.forEach((t,i)=>{const a=points[t.from],b=points[t.to];out.push(`<line class="route ${t.repeat?'repeat':'primary'}" data-route="${i+1}" x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}" marker-end="url(#print-arrow)"/>`);if(snapshot.view?.showRouteNumbers){out.push(`<text class="route-number" data-route-number="${i+1}" x="${fmt((a.x+b.x)/2)}" y="${fmt((a.y+b.y)/2)}" text-anchor="middle">${i+1}</text>`);}});
    if(snapshot.view?.showEdgeNumbers&&snapshot.numbering){for(const e of graph.edges){const a=points[e.u],b=points[e.v],x=(a.x+b.x)/2,y=(a.y+b.y)/2,n=snapshot.numbering.edgeNumberById[e.id];out.push(`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(Math.max(7,edgeMm*.055))}" fill="#fff" stroke="#bfdbfe"/><text class="edge-number" data-edge-number="${n}" x="${fmt(x)}" y="${fmt(y)}" text-anchor="middle">${n}</text>`);}}
    const startId=snapshot.routing?.startId,endId=snapshot.routing?.endId;if(startId!==null&&startId!==undefined){const p=points[startId];if(startId===endId){out.push(`<circle cx="${fmt(p.x)}" cy="${fmt(p.y)}" r="${fmt(r)}" fill="#fff" stroke="#16a34a" stroke-width="3"/><circle cx="${fmt(p.x)}" cy="${fmt(p.y)}" r="${fmt(r*.6)}" fill="none" stroke="#ea580c" stroke-width="3"/><text class="endpoint" x="${fmt(p.x+r*1.8)}" y="${fmt(p.y-r*1.6)}">START / END</text>`);}else{out.push(`<circle cx="${fmt(p.x)}" cy="${fmt(p.y)}" r="${fmt(r)}" fill="#16a34a"/><text class="endpoint" x="${fmt(p.x+r*1.8)}" y="${fmt(p.y-r*1.6)}">START</text>`);const e=points[endId];out.push(`<circle cx="${fmt(e.x)}" cy="${fmt(e.y)}" r="${fmt(r)}" fill="#ea580c"/><text class="endpoint" x="${fmt(e.x+r*1.8)}" y="${fmt(e.y-r*1.6)}">END</text>`);}}
    out.push('</svg>');return out.join('');
  }
  return {render};
});
