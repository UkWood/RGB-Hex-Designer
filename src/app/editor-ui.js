(function(root,factory){
  const req=typeof module==='object'&&module.exports;
  const deps=req?{
    HexGrid:require('../core/hex-grid'),GeometryBuilder:require('../core/geometry-builder'),ProjectIO:require('../core/project-io'),SvgExporter:require('../core/svg-exporter')
  }:{HexGrid:root.HexGrid,GeometryBuilder:root.GeometryBuilder,ProjectIO:root.ProjectIO,SvgExporter:root.SvgExporter};
  const api=factory(deps);
  if(req) module.exports=api; else root.EditorUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(deps){
  const {HexGrid,GeometryBuilder,ProjectIO,SvgExporter}=deps;
  const RENDER_SIDE=60;
  const SQRT3=Math.sqrt(3);
  const ANIMATION_MS=350;
  const FIT_PADDING=20;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const fmt=(v,d=2)=>Number.isFinite(v)?Number(v).toFixed(d):'—';
  const fmtMm=v=>Number.isFinite(v)?String(Math.round(v*100)/100):'—';
  const key=(q,r)=>`${q},${r}`;

  function rotatePoint(p,orientation='pointy'){return orientation==='flat'?{x:-p.y,y:p.x}:{x:p.x,y:p.y};}
  function unrotatePoint(p,orientation='pointy'){return orientation==='flat'?{x:p.y,y:-p.x}:{x:p.x,y:p.y};}
  function center(q,r,orientation='pointy'){
    return rotatePoint({x:SQRT3*RENDER_SIDE*(q+r/2),y:1.5*RENDER_SIDE*r},orientation);
  }
  function polygonPoints(q,r,orientation='pointy'){
    const c0={x:SQRT3*RENDER_SIDE*(q+r/2),y:1.5*RENDER_SIDE*r},a=SQRT3/2*RENDER_SIDE,h=.5*RENDER_SIDE,R=RENDER_SIDE;
    return [[0,-R],[a,-h],[a,h],[0,R],[-a,h],[-a,-h]].map(([dx,dy])=>rotatePoint({x:c0.x+dx,y:c0.y+dy},orientation)).map(p=>`${p.x},${p.y}`).join(' ');
  }
  function axialRound(x,y,orientation='pointy'){
    const p=unrotatePoint({x,y},orientation);
    const rf=(2/3)*p.y/RENDER_SIDE;
    const qf=p.x/(SQRT3*RENDER_SIDE)-rf/2;
    let cx=qf,cz=rf,cy=-cx-cz;
    let rx=Math.round(cx),ry=Math.round(cy),rz=Math.round(cz);
    const dx=Math.abs(rx-cx),dy=Math.abs(ry-cy),dz=Math.abs(rz-cz);
    if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;
    return {q:rx,r:rz};
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function animationStartStep(current,total){
    const n=Math.max(0,Number(total)||0),c=clamp(Number(current)||0,0,n);
    return n>0&&c>=n?0:c;
  }
  function animationTick(current,total){
    const n=Math.max(0,Number(total)||0),step=Math.min(n,(Number(current)||0)+1);
    return {step,done:step>=n};
  }
  function overlaps(a,b){return !(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}
  function placeLabel(anchorX,anchorY,text,occupied=[]){
    const w=Math.max(30,String(text).length*7+12),h=20;
    const candidates=[
      {x:anchorX+14,y:anchorY-34},{x:anchorX+14,y:anchorY+14},
      {x:anchorX-w-14,y:anchorY-34},{x:anchorX-w-14,y:anchorY+14},
      {x:anchorX-w/2,y:anchorY-46},{x:anchorX-w/2,y:anchorY+24},
      {x:anchorX+24,y:anchorY-h/2},{x:anchorX-w-24,y:anchorY-h/2}
    ];
    for(const c of candidates){const rect={...c,w,h};if(!occupied.some(r=>overlaps(rect,r)))return rect;}
    for(let ring=1;ring<=8;ring++){
      const rect={x:anchorX+14*ring,y:anchorY-34-10*ring,w,h};
      if(!occupied.some(r=>overlaps(rect,r)))return rect;
    }
    return {x:anchorX+14,y:anchorY-34,w,h};
  }
  function lineRect(a,b,pad=8){return {x:Math.min(a.x,b.x)-pad,y:Math.min(a.y,b.y)-pad,w:Math.abs(a.x-b.x)+2*pad,h:Math.abs(a.y-b.y)+2*pad};}

  function fitBoundsTransform(bounds,width=1000,height=700,padding=FIT_PADDING){
    const pad=Math.max(FIT_PADDING,Number(padding)||0);
    const x=Number(bounds&&('x' in bounds?bounds.x:bounds.minX));
    const y=Number(bounds&&('y' in bounds?bounds.y:bounds.minY));
    const w=Math.max(1,Number(bounds&&('width' in bounds?bounds.width:(bounds.maxX-bounds.minX)))||1);
    const h=Math.max(1,Number(bounds&&('height' in bounds?bounds.height:(bounds.maxY-bounds.minY)))||1);
    if(!Number.isFinite(x)||!Number.isFinite(y))return {scale:1,tx:width/2,ty:height/2};
    const usableW=Math.max(1,width-2*pad),usableH=Math.max(1,height-2*pad);
    const scale=Math.min(usableW/w,usableH/h);
    return {scale,tx:width/2-(x+w/2)*scale,ty:height/2-(y+h/2)*scale};
  }

  function computeFitTransform(snapshot,width=1000,height=700){
    const vertices=snapshot&&snapshot.graph&&snapshot.graph.vertices?snapshot.graph.vertices:[];
    if(!vertices.length)return {scale:1,tx:width/2,ty:height/2};
    const orientation=snapshot.orientation||'pointy';
    const points=vertices.map(v=>GeometryBuilder.toWorld(v,RENDER_SIDE,orientation));
    const cells=snapshot&&Array.isArray(snapshot.cells)?snapshot.cells:[];
    if(cells.length){
      const grid=HexGrid.create(cells);
      for(const cell of grid.availableNeighbors()){
        const target=GeometryBuilder.build([cell]);
        for(const v of target.vertices)points.push(GeometryBuilder.toWorld(v,RENDER_SIDE,orientation));
      }
    }
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    return fitBoundsTransform({x:minX,y:minY,width:maxX-minX,height:maxY-minY},width,height,FIT_PADDING);
  }

  function mount(rootElement,state){
    rootElement.innerHTML=`
    <main class="app-shell">
      <header class="app-head"><div><div class="app-title">Hex Router Designer</div><div class="subtle">Конструктор произвольной связной конфигурации шестигранных RGB-модулей</div></div><div id="status-pill" class="status-pill">Пустой проект</div></header>
      <div class="layout">
        <section class="workspace">
          <div class="toolbar">
            <button id="undo-btn" type="button">↶ Отменить</button><button id="redo-btn" type="button">↷ Вернуть</button><button id="delete-btn" type="button">Удалить</button><button id="clear-btn" type="button" class="danger">Очистить</button><button id="fit-btn" type="button">Вписать</button>
            <label class="orientation-switch" title="Развернуть всё поле на 90 градусов"><span>Ориентация</span><input id="orientation-toggle" type="checkbox"><span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span><span id="orientation-text">вертикальная</span></label>
            <span class="spacer"></span><span id="module-counter" class="subtle">0 модулей</span>
          </div>
          <div class="canvas-wrap">
            <svg id="hex-canvas" class="hex-canvas" viewBox="0 0 1000 700" aria-label="Редактор шестигранной конструкции"></svg>
            <div id="canvas-toast" class="toast hidden" aria-live="polite"></div>
          </div>
          <div class="route-controls">
            <button id="route-prev-btn" type="button" aria-label="Предыдущий шаг">◀</button><button id="route-next-btn" type="button" aria-label="Следующий шаг">▶</button>
            <input id="route-slider" type="range" min="0" max="0" value="0" aria-label="Шаг маршрута">
            <button id="route-animate-btn" type="button">Анимация</button><button id="route-pause-btn" type="button">Пауза</button>
          </div>
          <div class="legend"><span><i class="swatch" style="background:var(--route)"></i>основной проход</span><span><i class="swatch" style="background:var(--repeat);border-top:2px dashed var(--repeat);background:none"></i>повтор</span><span><i class="swatch" style="background:var(--start)"></i>START</span><span><i class="swatch" style="background:var(--end)"></i>END</span><span id="system-bounds">Габариты: —</span></div>
        </section>
        <aside class="sidebar">
          <section class="sidebar-section"><h2>Трассировка</h2>
            <div class="field"><label for="objective-select">Критерий оптимизации</label><select id="objective-select"><option value="min_repeats">Минимум повторов</option><option value="avoid_shared">Избегать общих сторон</option></select></div>
            <div class="control-grid"><button id="auto-endpoints-btn" type="button" class="primary">AUTO START/END</button><button id="pick-start-btn" type="button">Назначить START</button><button id="pick-end-btn" type="button">Назначить END</button><button id="show-full-route-btn" type="button">Весь маршрут</button></div>
            <label class="check"><input id="show-numbers" type="checkbox" checked> Номера модулей</label>
            <label class="check"><input id="show-route-numbers" type="checkbox"> Номера шагов</label>
            <label class="check"><input id="show-diagnostics" type="checkbox"> Диагностика нечётных узлов</label>
          </section>
          <section class="sidebar-section"><h2>Лента и питание</h2>
            <div class="control-grid">
              <div class="field"><label for="segments-per-side">Сегментов на сторону</label><input id="segments-per-side" type="number" min="1" step="1" value="6"></div>
              <div class="field"><label for="led-per-m">LED/м</label><input id="led-per-m" type="number" min="1" step="1" value="60"></div>
              <div class="field"><label for="side-mm">Сторона, мм (расчёт)</label><input id="side-mm" type="number" step="0.001" value="100" readonly></div>
              <div class="field"><label for="watts-per-m">Вт/м</label><input id="watts-per-m" type="number" min="0.1" step="0.1" value="18"></div>
              <div class="field"><label for="voltage">Напряжение</label><select id="voltage"><option value="5">5 В</option><option value="12" selected>12 В</option><option value="24">24 В</option></select></div>
              <div class="field"><label for="reserve-percent">Запас БП, %</label><input id="reserve-percent" type="number" min="0" step="1" value="20"></div>
            </div>
          </section>
          <section class="sidebar-section"><h2>Расчёт</h2><div id="metrics" class="metrics"></div><div id="warnings" aria-live="polite"></div></section>
          <section class="sidebar-section"><h2>Проект</h2><div class="file-actions"><button id="save-json-btn" type="button">Сохранить JSON</button><label class="file-label">Открыть JSON<input id="load-json-input" type="file" accept="application/json,.json"></label><button id="export-svg-btn" type="button">Экспорт SVG</button></div></section>
          <section class="sidebar-section"><h2>Подключение</h2><div class="electrical-note"><strong>START:</strong> +V, GND, DATA IN.<br><strong>END:</strong> +V, GND. Питание подаётся с обоих концов от одной согласованной системы питания. Земля контроллера общая. Расчёт носит рекомендательный характер и не заменяет проверку падения напряжения, сечения проводов и защиты.</div></section>
        </aside>
      </div>
    </main>`;

    const $=id=>rootElement.querySelector('#'+id);
    const svg=$('hex-canvas');
    let snap=state.snapshot();
    let routeStep=0,pickMode=null,deleteMode=false,animation=null,fitRequest=0;
    const view={scale:1,tx:500,ty:350};
    const pointers=new Map();
    let gesture=null;

    function notify(text){const el=$('canvas-toast');el.textContent=text;el.classList.remove('hidden');clearTimeout(notify.t);notify.t=setTimeout(()=>el.classList.add('hidden'),2400);}
    function messageFor(m){return ({disconnects:'Удаление разорвёт конструкцию.',use_clear:'Последний модуль удаляется кнопкой «Очистить».',must_touch:'Новый модуль должен касаться существующего.',same_endpoint:'START и END должны различаться.',not_lower_boundary:'Точка должна быть на нижнем внешнем контуре.',invalid_numeric:'Введите корректное положительное число.',selection_disabled:'Постоянное выделение модулей отключено.'}[m]||m||'Операция отклонена.');}
    function dispatch(action,{fit=false,preserveStep=false}={}){const r=state.dispatch(action);if(!r.ok){notify(messageFor(r.message));return false;}refresh({fit,preserveStep});return true;}
    function stopAnimation(){if(animation){clearInterval(animation);animation=null;}updatePlaybackButtons();}
    function updatePlaybackButtons(){if(!$('route-pause-btn'))return;const total=snap.solution?.traversals.length||0;$('route-pause-btn').disabled=!animation;$('route-animate-btn').disabled=total===0;}

    function refresh({fit=false,preserveStep=false}={}){
      stopAnimation();snap=state.snapshot();
      if(!preserveStep) routeStep=snap.solution?snap.solution.traversals.length:0;
      renderAll();
      if(fit)scheduleFitView();
    }
    function statusText(){if(!snap.cells.length)return 'Пустой проект';const mode=snap.routing.endpointMode==='auto'?'AUTO':'MANUAL';return `${snap.cells.length} мод. · ${mode} · ${snap.solution?snap.solution.repeatCount:0} повтор.`;}

    function renderAll(){
      $('status-pill').textContent=statusText();$('module-counter').textContent=`${snap.cells.length} модулей`;
      $('undo-btn').disabled=snap.history.undoCount===0;$('redo-btn').disabled=snap.history.redoCount===0;$('delete-btn').disabled=snap.cells.length===0;
      $('delete-btn').classList.toggle('pick-active',deleteMode);$('delete-btn').textContent=deleteMode?'Выберите модуль…':'Удалить';
      $('orientation-toggle').checked=snap.orientation==='flat';$('orientation-text').textContent=snap.orientation==='flat'?'горизонтальная':'вертикальная';
      $('objective-select').value=snap.routing.objective;$('show-numbers').checked=!!snap.view.showNumbers;$('show-route-numbers').checked=!!snap.view.showRouteNumbers;$('show-diagnostics').checked=!!snap.view.showDiagnostics;
      $('segments-per-side').value=snap.strip.segmentsPerSide;$('side-mm').value=String(Math.round(snap.strip.sideMm*1000)/1000);$('led-per-m').value=snap.strip.ledPerM;$('watts-per-m').value=snap.strip.wattsPerM;$('voltage').value=String(snap.strip.voltage);$('reserve-percent').value=snap.strip.reservePercent;
      const bounds=GeometryBuilder.worldBounds(snap.graph,snap.strip.sideMm,snap.orientation);$('system-bounds').textContent=snap.cells.length?`Габариты: ${fmtMm(bounds.width)} × ${fmtMm(bounds.height)} мм`:'Габариты: —';
      $('pick-start-btn').classList.toggle('pick-active',pickMode==='start');$('pick-end-btn').classList.toggle('pick-active',pickMode==='end');
      const max=snap.solution?snap.solution.traversals.length:0;routeStep=clamp(routeStep,0,max);$('route-slider').max=String(max);$('route-slider').value=String(routeStep);$('route-prev-btn').disabled=routeStep<=0;$('route-next-btn').disabled=routeStep>=max;
      updatePlaybackButtons();renderMetrics();renderWarnings();renderCanvas();
    }
    function renderMetrics(){
      const e=snap.electrical;
      const values=e?[
        ['Сегм./стор.',String(snap.strip.segmentsPerSide)],['Сторона',`${fmt(snap.strip.sideMm,2)} мм`],['Уникальная длина',`${fmt(e.uniqueLengthM)} м`],['Повторы',`${fmt(e.repeatLengthM)} м`],['Итого ленты',`${fmt(e.totalLengthM)} м`],['LED ≈',String(e.ledCountApprox)],['Мощность',`${fmt(e.powerW,1)} Вт`],['Ток',`${fmt(e.currentA,2)} А`],['БП ≥',`${fmt(e.recommendedPsuW,1)} Вт`],['Повтор',`${fmt(e.repeatPercent,1)}%`],['START–END',`${fmt(e.endpointSeparationM)} м`],['Сегментов трассы',String(snap.graph.edges.length)]
      ]:[['Модули',String(snap.cells.length)],['Маршрут','—']];
      $('metrics').innerHTML=values.map(([a,b])=>`<div class="metric"><span>${escapeHtml(a)}</span><strong>${escapeHtml(b)}</strong></div>`).join('');
    }
    function renderWarnings(){const list=[...snap.warnings];if(pickMode)list.unshift(`Выберите ${pickMode==='start'?'START':'END'} среди подсвеченных нижних точек.`);if(deleteMode)list.unshift('Режим удаления: нажмите на шестигранник. Esc отменяет режим.');$('warnings').innerHTML=list.length?`<div class="warning-box">${list.map(escapeHtml).join('<br>')}</div>`:'';}

    function line(x1,y1,x2,y2,attrs=''){return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;}
    function labelMarkup(rect,text,color='var(--text)',className='diagram-label'){
      const tx=rect.x+rect.w/2,ty=rect.y+14;
      return `<g class="${className}" pointer-events="none"><rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" rx="4" fill="var(--panel)" fill-opacity=".88" stroke="var(--border)" stroke-width=".5"/><text x="${tx}" y="${ty}" text-anchor="middle" font-size="11" font-weight="750" fill="${color}">${escapeHtml(text)}</text></g>`;
    }
    function routeLabelMarkup(x,y,text){
      const w=Math.max(18,String(text).length*7+8),h=18;
      return `<g class="route-label" pointer-events="none"><rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="5" fill="var(--panel)" fill-opacity=".92" stroke="var(--border)" stroke-width=".5"/><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="800" fill="var(--text)">${escapeHtml(text)}</text></g>`;
    }
    function renderCanvas(){
      const orientation=snap.orientation||'pointy';
      const chunks=[],labels=[],occupied=[];
      chunks.push(`<defs><marker id="ui-arrow" markerWidth="3.5" markerHeight="3.5" refX="3" refY="1.5" orient="auto"><path d="M0,0 L0,3 L3.5,1.5 z" fill="var(--route)"/></marker></defs>`);
      chunks.push(`<g id="scene" class="${deleteMode?'delete-mode':''}" transform="translate(${view.tx} ${view.ty}) scale(${view.scale})"><rect data-pan-bg="1" x="-5000" y="-5000" width="10000" height="10000" fill="transparent"/>`);
      const grid=HexGrid.create(snap.cells);
      if(snap.cells.length){
        for(const face of grid.freeFaces()){
          const a=center(face.owner.q,face.owner.r,orientation),b=center(face.target.q,face.target.r,orientation);
          const x=(a.x+b.x)/2,y=(a.y+b.y)/2;
          occupied.push({x:x-19,y:y-19,w:38,h:38});
          chunks.push(`<g class="add-face" data-interactive="1" data-add-face="1" data-add-q="${face.target.q}" data-add-r="${face.target.r}" role="button" tabindex="0" aria-label="Добавить модуль на эту грань"><circle class="add-face-hit" cx="${x}" cy="${y}" r="16" fill="var(--start)" fill-opacity=".92" stroke="var(--start)" stroke-width="2"/><text class="add-face-plus" x="${x}" y="${y+6}" text-anchor="middle" font-size="20" font-weight="800" fill="white" pointer-events="none">+</text></g>`);
        }
      }
      for(const e of snap.graph.edges){const a=GeometryBuilder.toWorld(snap.graph.vertices[e.u],RENDER_SIDE,orientation),b=GeometryBuilder.toWorld(snap.graph.vertices[e.v],RENDER_SIDE,orientation);chunks.push(line(a.x,a.y,b.x,b.y,`stroke="var(--corridor)" stroke-width="14" stroke-linecap="round"`));}
      const cellOrder=[...snap.cells].sort((a,b)=>a.r-b.r||a.q-b.q);
      cellOrder.forEach((c,i)=>{chunks.push(`<polygon data-interactive="1" data-cell-key="${key(c.q,c.r)}" points="${polygonPoints(c.q,c.r,orientation)}" fill="transparent" stroke="var(--hex)" stroke-width="1.8"/>`);if(snap.view.showNumbers){const p=center(c.q,c.r,orientation);const rect={x:p.x-13,y:p.y-11,w:26,h:20};occupied.push(rect);labels.push(labelMarkup(rect,String(i+1),'var(--muted)','module-label'));}});
      if(snap.solution){
        const upto=Math.min(routeStep,snap.solution.traversals.length);
        for(let i=0;i<upto;i++){
          const t=snap.solution.traversals[i],a=GeometryBuilder.toWorld(snap.graph.vertices[t.from],RENDER_SIDE,orientation),b=GeometryBuilder.toWorld(snap.graph.vertices[t.to],RENDER_SIDE,orientation);const color=t.repeat?'var(--repeat)':'var(--route)';const dash=t.repeat?'stroke-dasharray="10 7"':'';
          chunks.push(line(a.x,a.y,b.x,b.y,`stroke="${color}" stroke-width="5.5" stroke-linecap="round" ${dash} marker-end="url(#ui-arrow)"`));
          occupied.push(lineRect(a,b,6));
          if(snap.view.showRouteNumbers){const x=(a.x+b.x)/2,y=(a.y+b.y)/2;labels.push(routeLabelMarkup(x,y,String(i+1)));}
        }
        if(snap.view.showDiagnostics)for(const id of snap.solution.oddVertexIds){const p=GeometryBuilder.toWorld(snap.graph.vertices[id],RENDER_SIDE,orientation);chunks.push(`<circle cx="${p.x}" cy="${p.y}" r="7" fill="none" stroke="var(--diag)" stroke-width="3"/>`);occupied.push({x:p.x-9,y:p.y-9,w:18,h:18});}
      }
      const lower=new Set(snap.boundary.lowerCandidateIds);for(const id of lower){const p=GeometryBuilder.toWorld(snap.graph.vertices[id],RENDER_SIDE,orientation);const active=pickMode?'1':'0';chunks.push(`<circle ${pickMode?'data-interactive="1" data-endpoint-id="'+id+'"':''} cx="${p.x}" cy="${p.y}" r="${pickMode?8:4}" fill="${pickMode?'var(--accent)':'var(--muted)'}" fill-opacity="${pickMode?.75:.35}" stroke="var(--panel)" stroke-width="2" opacity="${active==='1'?1:.55}"/>`);}
      if(snap.routing.startId!==null&&snap.graph.vertices[snap.routing.startId]){const p=GeometryBuilder.toWorld(snap.graph.vertices[snap.routing.startId],RENDER_SIDE,orientation);chunks.push(`<circle cx="${p.x}" cy="${p.y}" r="9" fill="var(--start)" stroke="var(--panel)" stroke-width="3"/>`);occupied.push({x:p.x-12,y:p.y-12,w:24,h:24});const rect=placeLabel(p.x,p.y,'START',occupied);occupied.push(rect);labels.push(labelMarkup(rect,'START','var(--start)','endpoint-label'));}
      if(snap.routing.endId!==null&&snap.graph.vertices[snap.routing.endId]){const p=GeometryBuilder.toWorld(snap.graph.vertices[snap.routing.endId],RENDER_SIDE,orientation);chunks.push(`<circle cx="${p.x}" cy="${p.y}" r="9" fill="var(--end)" stroke="var(--panel)" stroke-width="3"/>`);occupied.push({x:p.x-12,y:p.y-12,w:24,h:24});const rect=placeLabel(p.x,p.y,'END',occupied);occupied.push(rect);labels.push(labelMarkup(rect,'END','var(--end)','endpoint-label'));}
      if(!snap.cells.length)labels.push(`<text x="0" y="0" text-anchor="middle" font-size="18" fill="var(--muted)" pointer-events="none">Кликните здесь или в другом месте, чтобы поставить первый модуль</text>`);
      chunks.push(`<g id="label-layer">${labels.join('')}</g></g>`);svg.innerHTML=chunks.join('');
    }

    function renderedSceneBounds(){
      const scene=svg.querySelector('#scene');
      if(!scene)return null;
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,found=false;
      for(const child of scene.children){
        if(child.hasAttribute&&child.hasAttribute('data-pan-bg'))continue;
        if(typeof child.getBBox!=='function')continue;
        let b;try{b=child.getBBox();}catch(_){continue;}
        if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite))continue;
        minX=Math.min(minX,b.x);minY=Math.min(minY,b.y);maxX=Math.max(maxX,b.x+b.width);maxY=Math.max(maxY,b.y+b.height);found=true;
      }
      return found?{x:minX,y:minY,width:Math.max(1,maxX-minX),height:Math.max(1,maxY-minY)}:null;
    }
    function fitRenderedScene(){
      const bounds=renderedSceneBounds();
      const fitted=bounds?fitBoundsTransform(bounds,1000,700,FIT_PADDING):computeFitTransform(snap,1000,700);
      view.scale=fitted.scale;view.tx=fitted.tx;view.ty=fitted.ty;renderCanvas();
    }
    function scheduleFitView(){
      const token=++fitRequest;
      const run=()=>{if(token===fitRequest)fitRenderedScene();};
      const afterOverlay=()=>{if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);else run();};
      if(typeof queueMicrotask==='function')queueMicrotask(afterOverlay);else Promise.resolve().then(afterOverlay);
    }
    function fitView(){fitRenderedScene();}
    function clientToSvg(evt){const r=svg.getBoundingClientRect();return{x:(evt.clientX-r.left)/r.width*1000,y:(evt.clientY-r.top)/r.height*700};}
    function svgToScene(p){return{x:(p.x-view.tx)/view.scale,y:(p.y-view.ty)/view.scale};}

    svg.addEventListener('click',e=>{
      const ep=e.target.closest('[data-endpoint-id]');if(ep&&pickMode){const type=pickMode==='start'?'SET_MANUAL_START':'SET_MANUAL_END';if(dispatch({type,vertexId:Number(ep.dataset.endpointId)})){pickMode=null;renderAll();}return;}
      const add=e.target.closest('[data-add-face]');if(add){if(deleteMode){notify('В режиме удаления выберите существующий шестигранник.');return;}dispatch({type:'ADD_HEX',q:Number(add.dataset.addQ),r:Number(add.dataset.addR)},{fit:false});return;}
      const cell=e.target.closest('[data-cell-key]');if(cell&&deleteMode){const ok=dispatch({type:'DELETE_HEX',key:cell.dataset.cellKey},{preserveStep:false});if(ok){deleteMode=false;renderAll();}return;}
    });
    svg.addEventListener('keydown',e=>{const add=e.target.closest&&e.target.closest('[data-add-face]');if(add&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(!deleteMode)dispatch({type:'ADD_HEX',q:Number(add.dataset.addQ),r:Number(add.dataset.addR)},{fit:false});}});
    svg.addEventListener('pointerdown',e=>{
      if(e.target.closest('[data-interactive]'))return;
      svg.setPointerCapture(e.pointerId);const p=clientToSvg(e);pointers.set(e.pointerId,p);
      if(pointers.size===1)gesture={type:'pan',start:p,tx:view.tx,ty:view.ty,moved:false};
      else if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={type:'pinch',distance:Math.hypot(a.x-b.x,a.y-b.y),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},scale:view.scale,tx:view.tx,ty:view.ty,moved:true};}
    });
    svg.addEventListener('pointermove',e=>{
      if(!pointers.has(e.pointerId))return;const p=clientToSvg(e);pointers.set(e.pointerId,p);
      if(gesture?.type==='pan'&&pointers.size===1){const dx=p.x-gesture.start.x,dy=p.y-gesture.start.y;if(Math.hypot(dx,dy)>3)gesture.moved=true;view.tx=gesture.tx+dx;view.ty=gesture.ty+dy;renderCanvas();}
      else if(pointers.size>=2){const [a,b]=[...pointers.values()].slice(0,2);const dist=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));const centerNow={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(gesture?.type!=='pinch')gesture={type:'pinch',distance:dist,center:centerNow,scale:view.scale,tx:view.tx,ty:view.ty,moved:true};const ns=clamp(gesture.scale*dist/gesture.distance,.1,8);const sceneCenter={x:(gesture.center.x-gesture.tx)/gesture.scale,y:(gesture.center.y-gesture.ty)/gesture.scale};view.scale=ns;view.tx=centerNow.x-sceneCenter.x*ns;view.ty=centerNow.y-sceneCenter.y*ns;renderCanvas();}
    });
    svg.addEventListener('pointerup',e=>{const p=clientToSvg(e);const was=gesture;pointers.delete(e.pointerId);if(pointers.size===0){if(was?.type==='pan'&&!was.moved&&!snap.cells.length){const s=svgToScene(p),a=axialRound(s.x,s.y,snap.orientation);dispatch({type:'ADD_HEX',q:a.q,r:a.r},{fit:true});}gesture=null;}});
    svg.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);if(!pointers.size)gesture=null;});
    svg.addEventListener('wheel',e=>{e.preventDefault();const p=clientToSvg(e),scene=svgToScene(p),ns=clamp(view.scale*(e.deltaY<0?1.12:.89),.1,8);view.scale=ns;view.tx=p.x-scene.x*ns;view.ty=p.y-scene.y*ns;renderCanvas();},{passive:false});

    $('undo-btn').addEventListener('click',()=>{deleteMode=false;dispatch({type:'UNDO'});});$('redo-btn').addEventListener('click',()=>{deleteMode=false;dispatch({type:'REDO'});});
    $('delete-btn').addEventListener('click',()=>{if(!snap.cells.length)return;pickMode=null;deleteMode=!deleteMode;renderAll();});
    $('clear-btn').addEventListener('click',()=>{pickMode=null;deleteMode=false;dispatch({type:'CLEAR'},{fit:true});});$('fit-btn').addEventListener('click',()=>scheduleFitView());
    $('orientation-toggle').addEventListener('change',e=>{deleteMode=false;pickMode=null;dispatch({type:'SET_ORIENTATION',orientation:e.target.checked?'flat':'pointy'},{fit:true});});
    $('auto-endpoints-btn').addEventListener('click',()=>{pickMode=null;deleteMode=false;dispatch({type:'RESET_AUTO'});});$('pick-start-btn').addEventListener('click',()=>{deleteMode=false;pickMode=pickMode==='start'?null:'start';renderAll();});$('pick-end-btn').addEventListener('click',()=>{deleteMode=false;pickMode=pickMode==='end'?null:'end';renderAll();});
    $('objective-select').addEventListener('change',e=>dispatch({type:'SET_OBJECTIVE',objective:e.target.value}));
    for(const [id,field] of [['segments-per-side','segmentsPerSide'],['led-per-m','ledPerM'],['watts-per-m','wattsPerM'],['voltage','voltage'],['reserve-percent','reservePercent']])$(id).addEventListener('change',e=>{if(!dispatch({type:'SET_STRIP_INPUT',field,value:e.target.value}))renderAll();});
    for(const [id,flag] of [['show-numbers','showNumbers'],['show-route-numbers','showRouteNumbers'],['show-diagnostics','showDiagnostics']])$(id).addEventListener('change',e=>dispatch({type:'SET_VIEW_FLAG',flag,value:e.target.checked},{preserveStep:true}));
    $('route-prev-btn').addEventListener('click',()=>{stopAnimation();routeStep=Math.max(0,routeStep-1);renderAll();});$('route-next-btn').addEventListener('click',()=>{stopAnimation();routeStep=Math.min(snap.solution?.traversals.length||0,routeStep+1);renderAll();});$('route-slider').addEventListener('input',e=>{stopAnimation();routeStep=Number(e.target.value);renderCanvas();$('route-prev-btn').disabled=routeStep<=0;$('route-next-btn').disabled=routeStep>=Number(e.target.max);});$('show-full-route-btn').addEventListener('click',()=>{stopAnimation();routeStep=snap.solution?.traversals.length||0;renderAll();});
    $('route-animate-btn').addEventListener('click',()=>{if(!snap.solution||!snap.solution.traversals.length)return;stopAnimation();const total=snap.solution.traversals.length;routeStep=animationStartStep(routeStep,total);renderAll();animation=setInterval(()=>{const next=animationTick(routeStep,total);routeStep=next.step;if(next.done){clearInterval(animation);animation=null;}renderAll();},ANIMATION_MS);updatePlaybackButtons();});
    $('route-pause-btn').addEventListener('click',()=>{stopAnimation();renderAll();});

    function download(name,text,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    $('save-json-btn').addEventListener('click',()=>download('hex-router-project.json',ProjectIO.serialize(snap),'application/json'));
    $('load-json-input').addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;try{const text=await file.text();const parsed=ProjectIO.parse(text);if(!parsed.ok){notify(parsed.error);return;}if(dispatch({type:'LOAD_PROJECT',project:parsed.project},{fit:true})){notify(parsed.warnings?.length?parsed.warnings.join(' '):'Проект загружен.');}}catch(err){notify('Не удалось прочитать файл: '+err.message);}finally{e.target.value='';}});
    $('export-svg-btn').addEventListener('click',()=>{if(!snap.solution||!snap.electrical){notify('Сначала создайте конструкцию.');return;}const text=SvgExporter.export({graph:snap.graph,modules:snap.graph.modules,solution:snap.solution,startId:snap.routing.startId,endId:snap.routing.endId,showModuleNumbers:snap.view.showNumbers,showRouteNumbers:snap.view.showRouteNumbers,electrical:snap.electrical,sideMm:snap.strip.sideMm,orientation:snap.orientation});download('hex-router-route.svg',text,'image/svg+xml');});

    const keyHandler=e=>{if(e.target.matches('input,select,textarea'))return;if(e.key==='Escape'){pickMode=null;deleteMode=false;renderAll();return;}if(e.key==='Delete'&&snap.cells.length){deleteMode=!deleteMode;pickMode=null;renderAll();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();deleteMode=false;dispatch({type:e.shiftKey?'REDO':'UNDO'});}};rootElement.addEventListener('keydown',keyHandler);
    renderAll();scheduleFitView();
    return {destroy(){fitRequest++;stopAnimation();rootElement.removeEventListener('keydown',keyHandler);rootElement.innerHTML='';}};
  }
  return {mount,computeFitTransform,fitBoundsTransform,animationStartStep,animationTick,placeLabel};
});
