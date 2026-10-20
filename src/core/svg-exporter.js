(function(root,factory){
  const GB=typeof module==='object'&&module.exports?require('./geometry-builder'):root.GeometryBuilder;
  const api=factory(GB);
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.SvgExporter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(GeometryBuilder){
  'use strict';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const fmt=n=>Number.isFinite(n)?(Math.round(n*100)/100).toString():'—';
  function exportSvg({graph,modules,solution,startId,endId,showModuleNumbers,showRouteNumbers,electrical,sideMm}){
    const svgNs='http'+'://www.w3.org/2000/svg';
    const pts=graph.vertices.map(v=>GeometryBuilder.toWorld(v,sideMm));
    const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
    const margin=Math.max(25,sideMm*0.35), line=Math.max(16,sideMm*.18);
    const summaryH=Math.max(sideMm*1.2,margin*1.5+8*line+20);
    const minX=Math.min(...xs)-margin,maxX=Math.max(...xs)+margin,minY=Math.min(...ys)-margin,maxY=Math.max(...ys)+margin;
    const width=maxX-minX,height=(maxY-minY)+summaryH;
    const out=[];
    out.push(`<svg xmlns="${svgNs}" viewBox="${fmt(minX)} ${fmt(minY)} ${fmt(width)} ${fmt(height)}" role="img" aria-label="Hex Router technical routing diagram">`);
    out.push(`<defs><marker id="dataArrow" markerWidth="4" markerHeight="4" refX="3.5" refY="1.5" orient="auto"><path d="M0,0 L0,3 L4,1.5 z" fill="#2563eb"/></marker></defs>`);
    out.push(`<style>.module{fill:none;stroke:#6b7280;stroke-width:2}.corridor{stroke:#d1d5db;stroke-width:12;stroke-linecap:round}.route{stroke:#2563eb;stroke-width:5;stroke-linecap:round}.route.repeat{stroke:#d97706;stroke-dasharray:10 7}.module-number,.route-number,.label,.summary{font-family:Arial,sans-serif;fill:#111827}.module-number,.route-number{font-size:${Math.max(10,sideMm*.13)}px}.label{font-size:${Math.max(12,sideMm*.15)}px;font-weight:700}.summary{font-size:${Math.max(11,sideMm*.12)}px}</style>`);
    for(const m of modules){
      const polygon=m.vertexIds.map(id=>`${fmt(pts[id].x)},${fmt(pts[id].y)}`).join(' ');
      out.push(`<polygon class="module" data-module="${esc(m.key)}" points="${polygon}"/>`);
      if(showModuleNumbers){
        const vs=m.vertexIds.map(id=>pts[id]); const cx=vs.reduce((s,p)=>s+p.x,0)/vs.length,cy=vs.reduce((s,p)=>s+p.y,0)/vs.length;
        out.push(`<text class="module-number" x="${fmt(cx)}" y="${fmt(cy)}" text-anchor="middle">${esc(m.key)}</text>`);
      }
    }
    for(const e of graph.edges){const a=pts[e.u],b=pts[e.v];out.push(`<line class="corridor" x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}"/>`);}
    solution.traversals.forEach((t,i)=>{
      const a=pts[t.from],b=pts[t.to]; const cls=t.repeat?'route repeat':'route primary';
      out.push(`<line class="${cls}" data-route="${i+1}" x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}" marker-end="url(#dataArrow)"${t.repeat?' stroke-dasharray="10 7"':''}/>`);
      if(showRouteNumbers){const x=(a.x+b.x)/2,y=(a.y+b.y)/2;out.push(`<text class="route-number" x="${fmt(x)}" y="${fmt(y)}" text-anchor="middle">${i+1}</text>`);}
    });
    const sp=pts[startId],ep=pts[endId],r=Math.max(5,sideMm*.07);
    out.push(`<circle cx="${fmt(sp.x)}" cy="${fmt(sp.y)}" r="${fmt(r)}" fill="#16a34a"/><text class="label" x="${fmt(sp.x+r*1.6)}" y="${fmt(sp.y-r)}">START</text>`);
    out.push(`<circle cx="${fmt(ep.x)}" cy="${fmt(ep.y)}" r="${fmt(r)}" fill="#ea580c"/><text class="label" x="${fmt(ep.x+r*1.6)}" y="${fmt(ep.y-r)}">END</text>`);
    out.push(`<text class="label" x="${fmt(minX+margin*.25)}" y="${fmt(maxY+margin*.6)}">DATA: START → END</text>`);
    const sx=minX+margin*.25,sy=maxY+margin*1.25;
    const summary=[`Modules: ${modules.length}`,`Unique segments: ${graph.edges.length}`,`Repeated: ${solution.repeatCount}`,`Total strip: ${fmt(electrical.totalLengthM)} m`,`LED approx: ${electrical.ledCountApprox}`,`Power: ${fmt(electrical.powerW)} W`,`Current: ${fmt(electrical.currentA)} A`,`PSU: ${fmt(electrical.recommendedPsuW)} W min.`];
    summary.forEach((text,i)=>out.push(`<text class="summary" x="${fmt(sx)}" y="${fmt(sy+i*line)}">${esc(text)}</text>`));
    out.push(`</svg>`);
    return out.join('');
  }
  return {export:exportSvg};
});
