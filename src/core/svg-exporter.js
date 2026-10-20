(function(root,factory){
  const GB=typeof module==='object'&&module.exports?require('./geometry-builder'):root.GeometryBuilder;
  const api=factory(GB);
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.SvgExporter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(GeometryBuilder){
  'use strict';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&apos;'}[c]));
  const fmt=n=>Number.isFinite(n)?(Math.round(n*100)/100).toString():'—';
  const value=(v,suffix='')=>Number.isFinite(Number(v))?`${fmt(Number(v))}${suffix}`:`—${suffix}`;

  function exportSvg({graph,modules,solution,startId,endId,showModuleNumbers,showRouteNumbers,electrical,sideMm,orientation='pointy'}){
    const svgNs='http'+'://www.w3.org/2000/svg';
    const pts=graph.vertices.map(v=>GeometryBuilder.toWorld(v,sideMm,orientation));
    const bounds=GeometryBuilder.worldBounds(graph,sideMm,orientation);
    const margin=Math.max(55,sideMm*.5);
    const dimOffset=Math.max(18,sideMm*.16);
    const line=Math.max(16,sideMm*.18);
    const centerX=(bounds.minX+bounds.maxX)/2,centerY=(bounds.minY+bounds.maxY)/2;
    const diagramWidth=bounds.width+2*margin;
    const viewWidth=Math.max(diagramWidth,Math.max(360,sideMm*3.6));
    const minX=centerX-viewWidth/2,maxX=centerX+viewWidth/2,minY=bounds.minY-margin;

    const segmentsPerSide=electrical&&Number.isFinite(electrical.segmentsPerSide)?electrical.segmentsPerSide:(Number(sideMm)*Number(electrical&&electrical.ledPerM)/1000);
    const summary=[
      'Параметры и расчёт',
      `Габариты: ${fmt(bounds.width)} × ${fmt(bounds.height)} мм`,
      `Модули: ${modules.length}`,
      `Сегментов на сторону: ${fmt(segmentsPerSide)}`,
      `LED/м: ${value(electrical&&electrical.ledPerM)}`,
      `Сторона: ${fmt(sideMm)} мм`,
      `Вт/м: ${value(electrical&&electrical.wattsPerM)}`,
      `Напряжение: ${value(electrical&&electrical.voltage,' В')}`,
      `Запас БП: ${value(electrical&&electrical.reservePercent,'%')}`,
      `Уникальных участков: ${graph.edges.length}`,
      `Повторных проходов: ${solution.repeatCount}`,
      `Уникальная длина: ${fmt(electrical.uniqueLengthM)} м`,
      `Повторы: ${fmt(electrical.repeatLengthM)} м`,
      `Итого ленты: ${fmt(electrical.totalLengthM)} м`,
      `LED ≈: ${electrical.ledCountApprox}`,
      `Мощность: ${fmt(electrical.powerW)} Вт`,
      `Ток: ${fmt(electrical.currentA)} А`,
      `БП ≥: ${fmt(electrical.recommendedPsuW)} Вт`,
      `Доля повтора: ${fmt(electrical.repeatPercent)}%`,
      `START–END: ${fmt(electrical.endpointSeparationM)} м`,
      'DATA: START → END; +V и GND подаются с обоих концов'
    ];
    const summaryStartY=bounds.maxY+margin+line;
    const bottom=summaryStartY+(summary.length-1)*line+line+Math.max(20,margin*.35);
    const height=bottom-minY;

    const out=[];
    out.push(`<svg xmlns="${svgNs}" viewBox="${fmt(minX)} ${fmt(minY)} ${fmt(viewWidth)} ${fmt(height)}" role="img" aria-label="Hex Router technical routing diagram">`);
    out.push(`<defs><marker id="dataArrow" markerWidth="4" markerHeight="4" refX="3.5" refY="1.5" orient="auto"><path d="M0,0 L0,3 L4,1.5 z" fill="#2563eb"/></marker></defs>`);
    out.push(`<style>.module{fill:none;stroke:#6b7280;stroke-width:2}.corridor{stroke:#d1d5db;stroke-width:12;stroke-linecap:round}.route{stroke:#2563eb;stroke-width:5;stroke-linecap:round}.route.repeat{stroke:#d97706;stroke-dasharray:10 7}.dimension-frame{fill:none;stroke:#9ca3af;stroke-width:1}.module-number,.route-number,.label,.summary,.dimension-label{font-family:Arial,sans-serif;fill:#111827;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}.module-number,.route-number{font-size:${Math.max(10,sideMm*.13)}px}.label{font-size:${Math.max(12,sideMm*.15)}px;font-weight:700}.dimension-label{font-size:${Math.max(11,sideMm*.12)}px;fill:#6b7280;font-weight:700;stroke-width:4px}.summary{font-size:${Math.max(11,sideMm*.12)}px;stroke-width:2px}.summary-title{font-weight:700;font-size:${Math.max(12,sideMm*.14)}px}</style>`);

    out.push(`<rect class="dimension-frame" x="${fmt(bounds.minX)}" y="${fmt(bounds.minY)}" width="${fmt(bounds.width)}" height="${fmt(bounds.height)}"/>`);
    const widthText=`${fmt(bounds.width)} мм`,heightText=`${fmt(bounds.height)} мм`;
    out.push(`<text class="dimension-label" data-dimension="width-top" x="${fmt(centerX)}" y="${fmt(bounds.minY-dimOffset)}" text-anchor="middle" dominant-baseline="middle">${esc(widthText)}</text>`);
    out.push(`<text class="dimension-label" data-dimension="width-bottom" x="${fmt(centerX)}" y="${fmt(bounds.maxY+dimOffset)}" text-anchor="middle" dominant-baseline="middle">${esc(widthText)}</text>`);
    out.push(`<text class="dimension-label" data-dimension="height-left" x="${fmt(bounds.minX-dimOffset)}" y="${fmt(centerY)}" text-anchor="middle" dominant-baseline="middle">${esc(heightText)}</text>`);
    out.push(`<text class="dimension-label" data-dimension="height-right" x="${fmt(bounds.maxX+dimOffset)}" y="${fmt(centerY)}" text-anchor="middle" dominant-baseline="middle">${esc(heightText)}</text>`);

    const orderedModules=[...modules].sort((a,b)=>a.r-b.r||a.q-b.q);
    for(const [index,m] of orderedModules.entries()){
      const polygon=m.vertexIds.map(id=>`${fmt(pts[id].x)},${fmt(pts[id].y)}`).join(' ');
      out.push(`<polygon class="module" data-module="${esc(m.key)}" points="${polygon}"/>`);
      if(showModuleNumbers){
        const vs=m.vertexIds.map(id=>pts[id]);
        const cx=vs.reduce((s,p)=>s+p.x,0)/vs.length,cy=vs.reduce((s,p)=>s+p.y,0)/vs.length;
        out.push(`<text class="module-number" x="${fmt(cx)}" y="${fmt(cy)}" text-anchor="middle" dominant-baseline="middle">${index+1}</text>`);
      }
    }
    for(const e of graph.edges){const a=pts[e.u],b=pts[e.v];out.push(`<line class="corridor" x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}"/>`);}
    solution.traversals.forEach((t,i)=>{
      const a=pts[t.from],b=pts[t.to]; const cls=t.repeat?'route repeat':'route primary';
      out.push(`<line class="${cls}" data-route="${i+1}" x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}" marker-end="url(#dataArrow)"${t.repeat?' stroke-dasharray="10 7"':''}/>`);
      if(showRouteNumbers){const x=(a.x+b.x)/2,y=(a.y+b.y)/2;out.push(`<text class="route-number" x="${fmt(x)}" y="${fmt(y)}" text-anchor="middle" dominant-baseline="middle">${i+1}</text>`);}
    });
    const sp=pts[startId],ep=pts[endId],r=Math.max(5,sideMm*.07);
    out.push(`<circle cx="${fmt(sp.x)}" cy="${fmt(sp.y)}" r="${fmt(r)}" fill="#16a34a"/><text class="label" x="${fmt(sp.x+r*1.8)}" y="${fmt(sp.y-r*1.3)}">START</text>`);
    out.push(`<circle cx="${fmt(ep.x)}" cy="${fmt(ep.y)}" r="${fmt(r)}" fill="#ea580c"/><text class="label" x="${fmt(ep.x+r*1.8)}" y="${fmt(ep.y-r*1.3)}">END</text>`);

    const sx=minX+Math.max(12,margin*.25);
    summary.forEach((text,i)=>out.push(`<text class="summary${i===0?' summary-title':''}" x="${fmt(sx)}" y="${fmt(summaryStartY+i*line)}">${esc(text)}</text>`));
    out.push(`</svg>`);
    return out.join('');
  }
  return {export:exportSvg};
});
