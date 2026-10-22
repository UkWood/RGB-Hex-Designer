(function(root,factory){
  const req=typeof module==='object'&&module.exports;
  const deps=req?{GeometryBuilder:require('./geometry-builder'),DiagramRenderer:require('./diagram-renderer')}:{GeometryBuilder:root.GeometryBuilder,DiagramRenderer:root.DiagramRenderer};
  const api=factory(deps);if(req)module.exports=api;else root.PrintDocument=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(deps){
  'use strict';
  const {GeometryBuilder,DiagramRenderer}=deps;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(n,d=2)=>Number.isFinite(Number(n))?Number(Number(n).toFixed(d)).toString():'—';
  function safeTitle(projectName){const raw=String(projectName??'').trim();if(!raw)return 'Без названия';const clean=raw.replace(/[<>:"/\\|?*\x00-\x1F]/g,'_').trim();return clean||'Без названия';}
  function item(label,value){return `<div class="parameter"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;}
  function render(snapshot){
    const title=safeTitle(snapshot?.projectName),graph=snapshot?.graph,e=snapshot?.electrical,strip=snapshot?.strip||{},solution=snapshot?.solution;
    if(!graph||!solution||!e)throw new Error('routeable construction is required for print export');
    const edgeMm=Number(strip.edgeMm??strip.sideMm),bounds=GeometryBuilder.worldBounds(graph,edgeMm,snapshot.orientation);
    const required=Number.isFinite(Number(snapshot.requiredWidthMm))&&Number.isFinite(Number(snapshot.requiredHeightMm))?`${fmt(snapshot.requiredWidthMm)} × ${fmt(snapshot.requiredHeightMm)} мм`:'—';
    const orientation=snapshot.orientation==='flat'?'горизонтальная':'вертикальная';
    const params=[
      ['Фактические габариты',`${fmt(bounds.width)} × ${fmt(bounds.height)} мм`],['Требуемые габариты',required],['Ориентация',orientation],['Шестигранников',String(graph.modules.length)],
      ['Уникальных рёбер',String(graph.edges.length)],['Сегментов на ребро',fmt(strip.segmentsPerEdge)],['LED/м',fmt(strip.ledPerM)],['Базовая длина ребра',`${fmt(strip.baseEdgeMm)} мм`],
      ['Коррекция длины ребра',`${fmt(strip.edgeCorrectionMm)} мм`],['Итоговая длина ребра',`${fmt(edgeMm)} мм`],['Вт/м',fmt(strip.wattsPerM)],['Напряжение',`${fmt(strip.voltage)} В`],
      ['Запас БП',`${fmt(strip.reservePercent)}%`],['Повторных проходов',String(solution.repeatCount)],['Уникальная длина',`${fmt(e.uniqueLengthM)} м`],['Повторы',`${fmt(e.repeatLengthM)} м`],
      ['Итого ленты',`${fmt(e.totalLengthM)} м`],['LED ≈',String(e.ledCountApprox)],['Мощность',`${fmt(e.powerW)} Вт`],['Ток',`${fmt(e.currentA)} А`],
      ['БП ≥',`${fmt(e.recommendedPsuW)} Вт`],['Доля повтора',`${fmt(e.repeatPercent)}%`],['START–END',`${fmt(e.endpointSeparationM)} м`]
    ];
    const closed=snapshot.routing?.startId===snapshot.routing?.endId;
    const connection=closed?'START / END: DATA выходит из точки старта, проходит замкнутый маршрут и возвращается в ту же точку; +V и GND подключаются согласно принятой схеме питания.':'DATA: START → END; +V и GND подаются с обоих концов.';
    const rows=(snapshot.numbering?.specRows||[]).map(r=>`<tr data-edge-row="${r.number}"><td>${r.number}</td><td>${r.additionalPasses===0?'':r.additionalPasses}</td></tr>`).join('');
    const diagram=DiagramRenderer.render(snapshot);
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}html,body{margin:0;padding:0;color:#111827;background:#fff;font-family:Arial,"Segoe UI",sans-serif;font-size:10pt}.page{width:100%}.page-scheme{height:185mm;display:flex;flex-direction:column;break-after:page;page-break-after:always}.page-details{break-before:page;page-break-before:always}.doc-title{font-size:16pt;font-weight:700;margin:0 0 2mm}.subtitle{font-size:9pt;color:#4b5563;margin:0 0 3mm}.diagram{flex:1;min-height:0}.diagram svg{display:block;width:100%;height:100%}.section-title{font-size:13pt;margin:0 0 3mm}.parameter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2mm 4mm;margin-bottom:4mm}.parameter{border-bottom:.2mm solid #d1d5db;padding:1.3mm 0;min-width:0}.parameter span{display:block;color:#6b7280;font-size:8pt}.parameter strong{display:block;margin-top:.5mm;font-size:9.5pt;overflow-wrap:anywhere}.connection{padding:2mm 2.5mm;border:.2mm solid #d1d5db;background:#f9fafb;margin:0 0 4mm}.edge-spec{width:100%;border-collapse:collapse;font-size:9pt}.edge-spec thead{display:table-header-group}.edge-spec th,.edge-spec td{border:.2mm solid #9ca3af;padding:1.4mm 2mm;text-align:left}.edge-spec th{background:#f3f4f6}.edge-spec th:first-child,.edge-spec td:first-child{width:35%}.edge-spec tr{break-inside:avoid;page-break-inside:avoid}.edge-spec tbody tr:nth-child(even){background:#fafafa}@media screen{body{padding:12px}.page{max-width:277mm;margin:0 auto 20px;box-shadow:0 0 0 1px #ddd;padding:6mm}.page-scheme{height:190mm}.page-details{min-height:190mm}}@media print{.page{padding:0}.page-scheme{height:185mm}}
    </style></head><body><section class="page page-scheme"><h1 class="doc-title">${esc(title)}</h1><p class="subtitle">Ориентация: ${esc(orientation)}</p><div class="diagram">${diagram}</div></section><section class="page page-details"><h1 class="doc-title">${esc(title)}</h1><h2 class="section-title">Параметры и расчёт</h2><div class="parameter-grid">${params.map(([a,b])=>item(a,b)).join('')}</div><p class="connection">${esc(connection)}</p><h2 class="section-title">Спецификация рёбер</h2><table class="edge-spec"><thead><tr><th>№ ребра</th><th>Дополнительные проходы</th></tr></thead><tbody>${rows}</tbody></table></section></body></html>`;
  }
  return {render,safeTitle};
});
