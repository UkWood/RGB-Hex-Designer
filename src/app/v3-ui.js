(function(root,factory){
  const req=typeof module==='object'&&module.exports;
  const deps=req?{GeometryBuilder:require('../core/geometry-builder') }:{GeometryBuilder:root.GeometryBuilder};
  const api=factory(deps);if(req)module.exports=api;else root.V3UI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function({GeometryBuilder}){
  'use strict';
  const RENDER_SIDE=60,FIT_PADDING=20;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function rectFitsViewport(rect,viewport,padding=FIT_PADDING){const p=Math.max(FIT_PADDING,Number(padding)||0);return rect.left>=viewport.left+p&&rect.top>=viewport.top+p&&rect.right<=viewport.right-p&&rect.bottom<=viewport.bottom-p;}
  function visibleSceneRect(svg){
    const viewport=svg&&svg.getBoundingClientRect?svg.getBoundingClientRect():null;if(!viewport)return null;
    const nodes=[...svg.querySelectorAll('#scene > *')].filter(n=>!n.hasAttribute('data-pan-bg'));
    let out=null;
    for(const n of nodes){if(!n.getBoundingClientRect)continue;const r=n.getBoundingClientRect();if(!Number.isFinite(r.left)||r.width===0&&r.height===0)continue;out=out?{left:Math.min(out.left,r.left),top:Math.min(out.top,r.top),right:Math.max(out.right,r.right),bottom:Math.max(out.bottom,r.bottom)}:{left:r.left,top:r.top,right:r.right,bottom:r.bottom};}
    return out&&{...out,width:out.right-out.left,height:out.bottom-out.top,viewport};
  }
  function install(host,state){
    if(!host||!state)return {destroy(){}};
    const $=id=>host.querySelector('#'+id),shell=host.querySelector('.app-shell'),toolbar=host.querySelector('.toolbar'),sidebar=host.querySelector('.sidebar'),svg=$('hex-canvas');
    if(!shell||!toolbar||!sidebar||!svg)return {destroy(){}};
    const style=document.createElement('style');style.id='v3-ui-style';style.textContent='.v3-project-bar{background:var(--panel);border:1px solid var(--border);border-radius:15px;padding:10px 13px;margin-bottom:12px}.v3-project-bar .field{margin:0}.v3-project-bar input[type="text"]{width:100%;min-height:44px;border:1px solid var(--border);background:var(--panel);border-radius:9px;padding:8px 10px}.v3-toolbar-field{display:grid;gap:2px;min-width:130px}.v3-toolbar-field label{font-size:.72rem;color:var(--muted)}.v3-toolbar-field input{width:130px!important;min-height:38px!important}.edge-number-v3 text{paint-order:stroke;stroke:var(--canvas);stroke-width:4px;stroke-linejoin:round}.combined-endpoint-v3 text{paint-order:stroke;stroke:var(--canvas);stroke-width:4px;stroke-linejoin:round}@media(max-width:760px){.v3-toolbar-field{flex:1 1 145px}.v3-toolbar-field input{width:100%!important}}';document.head.appendChild(style);

    const projectBar=document.createElement('section');projectBar.className='v3-project-bar';projectBar.innerHTML='<div class="field"><label for="project-name">Наименование проекта</label><input id="project-name" type="text" autocomplete="off" placeholder="Введите наименование проекта"></div>';shell.insertBefore(projectBar,shell.firstChild);
    const orientation=$('orientation-toggle')?.closest('.orientation-switch');
    const targetBox=document.createElement('span');targetBox.className='v3-target-inputs';targetBox.style.display='contents';targetBox.innerHTML='<span class="v3-toolbar-field"><label for="required-width-mm">Требуемая ширина, мм</label><input id="required-width-mm" type="number" min="0.001" step="1"></span><span class="v3-toolbar-field"><label for="required-height-mm">Требуемая высота, мм</label><input id="required-height-mm" type="number" min="0.001" step="1"></span>';
    if(orientation)orientation.insertAdjacentElement('afterend',targetBox);else toolbar.appendChild(targetBox);

    const legacySegments=$('segments-per-side'),legacySide=$('side-mm');
    for(const el of [legacySegments,legacySide])if(el?.closest('.field'))el.closest('.field').style.display='none';
    const stripGrid=legacySegments?.closest('.control-grid');
    if(stripGrid){const fields=document.createElement('div');fields.style.display='contents';fields.innerHTML='<div class="field"><label for="segments-per-edge">Сегментов на ребро</label><input id="segments-per-edge" type="number" min="1" step="1"></div><div class="field"><label for="base-edge-mm">Базовая длина ребра, мм</label><input id="base-edge-mm" type="number" readonly></div><div class="field"><label for="edge-correction-mm">Коррекция длины ребра, мм</label><input id="edge-correction-mm" type="number" step="0.1"></div><div class="field"><label for="edge-mm">Итоговая длина ребра, мм</label><input id="edge-mm" type="number" readonly></div>';stripGrid.prepend(fields);}
    const objective=$('objective-select');if(objective){const avoid=[...objective.options].find(o=>o.value==='avoid_shared');if(avoid)avoid.textContent='Избегать общих рёбер';}

    const oldHex=$('show-numbers'),oldRoute=$('show-route-numbers');for(const el of [oldHex,oldRoute])if(el?.closest('.check'))el.closest('.check').style.display='none';
    const diag=$('show-diagnostics');if(diag?.closest('.sidebar-section')){const box=document.createElement('div');box.innerHTML='<label class="check"><input id="show-hex-numbers" type="checkbox"> № шестигранников</label><label class="check"><input id="show-edge-numbers" type="checkbox"> № рёбер</label><label class="check"><input id="show-route-numbers" type="checkbox"> № шагов маршрута</label>';diag.closest('.check').before(...box.children);}
    const oldSvg=$('export-svg-btn');if(oldSvg)oldSvg.style.display='none';
    const fileActions=oldSvg?.closest('.file-actions');if(fileActions){const pdf=document.createElement('button');pdf.id='export-pdf-btn';pdf.type='button';pdf.textContent='Экспорт PDF';fileActions.appendChild(pdf);}

    let destroyed=false,scheduled=false;
    function forceEditorRefresh(){const d=$('show-diagnostics');if(d)d.dispatchEvent(new Event('change',{bubbles:true}));}
    function refreshDimensionLayer(){const scene=svg.querySelector('#scene');if(!scene||!root.DimensionOverlay)return;scene.querySelector('#dimension-frame-layer')?.remove();const markup=root.DimensionOverlay.dimensionMarkup(state.snapshot());if(markup)scene.insertAdjacentHTML('beforeend',markup);}
    function syncFields(){
      const s=state.snapshot();const set=(id,v)=>{const el=$(id);if(el&&document.activeElement!==el)el.value=v??'';};
      set('project-name',s.projectName);set('required-width-mm',s.requiredWidthMm);set('required-height-mm',s.requiredHeightMm);set('segments-per-edge',s.strip?.segmentsPerEdge);set('base-edge-mm',s.strip?.baseEdgeMm);set('edge-correction-mm',s.strip?.edgeCorrectionMm);set('edge-mm',s.strip?.edgeMm);
      if($('show-hex-numbers'))$('show-hex-numbers').checked=!!s.view?.showHexNumbers;if($('show-edge-numbers'))$('show-edge-numbers').checked=!!s.view?.showEdgeNumbers;if($('show-route-numbers'))$('show-route-numbers').checked=!!s.view?.showRouteNumbers;
    }
    function renderNumbering(){
      const scene=svg.querySelector('#scene'),snap=state.snapshot();if(!scene)return;
      const order=[...(snap.cells||[])].sort((a,b)=>a.r-b.r||a.q-b.q),groups=[...scene.querySelectorAll('.module-label')];
      groups.forEach((g,i)=>{const c=order[i],text=g.querySelector('text'),n=c&&snap.numbering?.hexNumberByKey?.[`${c.q},${c.r}`];if(text&&n!==undefined&&text.textContent!==String(n))text.textContent=String(n);});
      scene.querySelector('#edge-number-layer-v3')?.remove();
      if(snap.view?.showEdgeNumbers&&snap.numbering){let body='';for(const e of snap.graph.edges){const a=GeometryBuilder.toWorld(snap.graph.vertices[e.u],RENDER_SIDE,snap.orientation),b=GeometryBuilder.toWorld(snap.graph.vertices[e.v],RENDER_SIDE,snap.orientation),x=(a.x+b.x)/2,y=(a.y+b.y)/2,n=snap.numbering.edgeNumberById[e.id];body+=`<g class="edge-number-v3" data-edge-id="${e.id}" pointer-events="none"><circle cx="${x}" cy="${y}" r="9" fill="var(--panel)" fill-opacity=".88" stroke="var(--border)" stroke-width=".6"/><text x="${x}" y="${y+3.5}" text-anchor="middle" font-size="10" font-weight="800" fill="var(--accent)">${n}</text></g>`;}scene.insertAdjacentHTML('beforeend',`<g id="edge-number-layer-v3" data-v3-generated="1">${body}</g>`);}
      scene.querySelector('#combined-endpoint-v3')?.remove();
      if(snap.routing?.startId!==null&&snap.routing?.startId===snap.routing?.endId){for(const g of scene.querySelectorAll('.endpoint-label'))g.remove();const p=GeometryBuilder.toWorld(snap.graph.vertices[snap.routing.startId],RENDER_SIDE,snap.orientation);scene.insertAdjacentHTML('beforeend',`<g id="combined-endpoint-v3" data-v3-generated="1" class="combined-endpoint-v3" pointer-events="none"><circle cx="${p.x}" cy="${p.y}" r="8" fill="var(--panel)" stroke="var(--start)" stroke-width="3"/><circle cx="${p.x}" cy="${p.y}" r="5" fill="none" stroke="var(--end)" stroke-width="3"/><text x="${p.x+15}" y="${p.y-14}" font-size="11" font-weight="800" fill="var(--text)">START / END</text></g>`);}
    }
    function syncCanvas(){scheduled=false;if(destroyed)return;syncFields();renderNumbering();}
    function scheduleSync(){if(scheduled||destroyed)return;scheduled=true;queueMicrotask(syncCanvas);}
    const observer=new MutationObserver(ms=>{const onlyOwn=ms.every(m=>[...m.addedNodes,...m.removedNodes].filter(n=>n.nodeType===1).every(n=>n.hasAttribute?.('data-v3-generated')||n.closest?.('[data-v3-generated]')));if(!onlyOwn)scheduleSync();});observer.observe(svg,{childList:true,subtree:true});

    $('project-name')?.addEventListener('input',e=>state.dispatch({type:'SET_PROJECT_NAME',value:e.target.value}));
    for(const [id,field] of [['required-width-mm','width'],['required-height-mm','height']])$(id)?.addEventListener('change',e=>{const r=state.dispatch({type:'SET_REQUIRED_DIMENSION',field,value:e.target.value});if(!r.ok)syncFields();refreshDimensionLayer();forceEditorRefresh();});
    $('segments-per-edge')?.addEventListener('change',e=>{const r=state.dispatch({type:'SET_STRIP_INPUT',field:'segmentsPerEdge',value:e.target.value});if(!r.ok)syncFields();forceEditorRefresh();});
    $('edge-correction-mm')?.addEventListener('change',e=>{const r=state.dispatch({type:'SET_STRIP_INPUT',field:'edgeCorrectionMm',value:e.target.value});if(!r.ok)syncFields();forceEditorRefresh();});
    $('show-hex-numbers')?.addEventListener('change',e=>{state.dispatch({type:'SET_VIEW_FLAG',flag:'showHexNumbers',value:e.target.checked});forceEditorRefresh();});
    $('show-edge-numbers')?.addEventListener('change',e=>{state.dispatch({type:'SET_VIEW_FLAG',flag:'showEdgeNumbers',value:e.target.checked});forceEditorRefresh();});
    $('show-route-numbers')?.addEventListener('change',e=>{state.dispatch({type:'SET_VIEW_FLAG',flag:'showRouteNumbers',value:e.target.checked});forceEditorRefresh();});
    host.addEventListener('click',e=>{if(!e.target.closest?.('[data-add-face]'))return;(root.requestAnimationFrame||setTimeout)(()=>{const r=visibleSceneRect(svg);if(r&&!rectFitsViewport(r,r.viewport,FIT_PADDING))$('fit-btn')?.click();},0);});
    syncFields();scheduleSync();
    return {destroy(){destroyed=true;observer.disconnect();projectBar.remove();targetBox.remove();style.remove();},refresh:()=>{syncFields();refreshDimensionLayer();scheduleSync();}};
  }
  return {install,rectFitsViewport,visibleSceneRect};
});
