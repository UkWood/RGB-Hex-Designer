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
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const fmt=(v,d=2)=>Number.isFinite(v)?Number(v).toFixed(d):'—';
  const key=(q,r)=>`${q},${r}`;

  function center(q,r){return {x:SQRT3*RENDER_SIDE*(q+r/2),y:1.5*RENDER_SIDE*r};}
  function polygonPoints(q,r){
    const c=center(q,r),a=SQRT3/2*RENDER_SIDE,h=.5*RENDER_SIDE,R=RENDER_SIDE;
    return [[0,-R],[a,-h],[a,h],[0,R],[-a,h],[-a,-h]].map(([dx,dy])=>`${c.x+dx},${c.y+dy}`).join(' ');
  }
  function axialRound(x,y){
    const rf=(2/3)*y/RENDER_SIDE;
    const qf=x/(SQRT3*RENDER_SIDE)-rf/2;
    let cx=qf,cz=rf,cy=-cx-cz;
    let rx=Math.round(cx),ry=Math.round(cy),rz=Math.round(cz);
    const dx=Math.abs(rx-cx),dy=Math.abs(ry-cy),dz=Math.abs(rz-cz);
    if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;
    return {q:rx,r:rz};
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function computeFitTransform(snapshot,width=1000,height=700){
    const vertices=snapshot&&snapshot.graph&&snapshot.graph.vertices?snapshot.graph.vertices:[];
    if(!vertices.length)return {scale:1,tx:width/2,ty:height/2};
    const points=vertices.map(v=>GeometryBuilder.toWorld(v,RENDER_SIDE));
    const cells=snapshot&&Array.isArray(snapshot.cells)?snapshot.cells:[];
    if(cells.length){
      const grid=HexGrid.create(cells);
      for(const cell of grid.availableNeighbors()){
        const target=GeometryBuilder.build([cell]);
        for(const v of target.vertices)points.push(GeometryBuilder.toWorld(v,RENDER_SIDE));
      }
    }
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY);
    const padding=Math.min(80,Math.max(40,Math.min(width,height)*.1));
    const usableW=Math.max(1,width-2*padding),usableH=Math.max(1,height-2*padding);
    const scale=clamp(Math.min(usableW/w,usableH/h),.25,4);
    return {scale,tx:width/2-(minX+maxX)/2*scale,ty:height/2-(minY+maxY)/2*scale};
  }

  function mount(rootElement,state){
    rootElement.innerHTML=`
    <main class="app-shell">
      <header class="app-head"><div><div class="app-title">Hex Router Designer</div><div class="subtle">Конструктор произвольной связной конфигурации шестигранных RGB-модулей</div></div><div id="status-pill" class="status-pill">Пустой проект</div></header>
      <div class="layout">
        <section class="workspace">
          <div class="toolbar">
            <button id="undo-btn" type="button">↶ Отменить</button><button id="redo-btn" type="button">↷ Вернуть</button><button id="delete-btn" type="button">Удалить</button><button id="clear-btn" type="button" class="danger">Очистить</button><button id="fit-btn" type="button">Вписать</button><span class="spacer"></span><span id="module-counter" class="subtle">0 модулей</span>
          </div>
          <div class="canvas-wrap">
            <div id="canvas-help" class="canvas-help">Первый модуль: кликните в любом месте поля. Затем нажимайте «+» на свободной грани, чтобы добавить один соседний модуль.</div>
            <svg id="hex-canvas" class="hex-canvas" viewBox="0 0 1000 700" aria-label="Редактор шестигранной конструкции"></svg>
            <div id="canvas-toast" class="toast hidden" aria-live="polite"></div>
          </div>
          <div class="route-controls">
            <button id="route-prev-btn" type="button" aria-label="Предыдущий шаг">◀</button><button id="route-next-btn" type="button" aria-label="Следующий шаг">▶</button>
            <input id="route-slider" type="range" min="0" max="0" value="0" aria-label="Шаг маршрута">
            <button id="route-animate-btn" type="button">Анимация</button><button id="route-pause-btn" type="button">Пауза</button>
          </div>
          <div class="legend"><span><i class="swatch" style="background:var(--route)"></i>основной проход</span><span><i class="swatch" style="background:var(--repeat);border-top:2px dashed var(--repeat);background:none"></i>повтор</span><span><i class="swatch" style="background:var(--start)"></i>START</span><span><i class="swatch" style="background:var(--end)"></i>END</span></div>
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
              <div class="field"><label for="side-mm">Сторона, мм</label><input id="side-mm" type="number" min="1" step="1" value="100"></div>
              <div class="field"><label for="led-per-m">LED/м</label><input id="led-per-m" type="number" min="1" step="1" value="60"></div>
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
    let routeStep=0,pickMode=null,animation=null;
    const view={scale:1,tx:500,ty:350};
    const pointers=new Map();
    let gesture=null;

    function notify(text){const el=$('canvas-toast');el.textContent=text;el.classList.remove('hidden');clearTimeout(notify.t);notify.t=setTimeout(()=>el.classList.add('hidden'),2400);}
    function messageFor(m){return ({disconnects:'Удаление разорвёт конструкцию.',use_clear:'Последний модуль удаляется кнопкой «Очистить».',must_touch:'Новый модуль должен касаться существующего.',same_endpoint:'START и END должны различаться.',not_lower_boundary:'Точка должна быть на нижнем внешнем контуре.',invalid_numeric:'Введите корректное положительное число.'}[m]||m||'Операция отклонена.');}
    function dispatch(action,{fit=false,preserveStep=false}={}){const r=state.dispatch(action);if(!r.ok){notify(messageFor(r.message));return false;}refresh({fit,preserveStep});return true;}
    function stopAnimation(){if(animation){clearInterval(animation);animation=null;}}

    function refresh({fit=false,preserveStep=false}={}){
      stopAnimation();snap=state.snapshot();
      if(!preserveStep) routeStep=snap.solution?snap.solution.traversals.length:0;
      if(fit) fitView();
      renderAll();
    }
    function statusText(){if(!snap.cells.length)return 'Пустой проект';const mode=snap.routing.endpointMode==='auto'?'AUTO':'MANUAL';return `${snap.cells.length} мод. · ${mode} · ${snap.solution?snap.solution.repeatCount:0} повтор.`;}

    function renderAll(){
      $('status-pill').textContent=statusText();$('module-counter').textContent=`${snap.cells.length} модулей`;
      $('undo-btn').disabled=snap.history.undoCount===0;$('redo-btn').disabled=snap.history.redoCount===0;$('delete-btn').disabled=!snap.selectedKey;
      $('objective-select').value=snap.routing.objective;$('show-numbers').checked=!!snap.view.showNumbers;$('show-route-numbers').checked=!!snap.view.showRouteNumbers;$('show-diagnostics').checked=!!snap.view.showDiagnostics;
      $('side-mm').value=snap.strip.sideMm;$('led-per-m').value=snap.strip.ledPerM;$('watts-per-m').value=snap.strip.wattsPerM;$('voltage').value=String(snap.strip.voltage);$('reserve-percent').value=snap.strip.reservePercent;
      $('pick-start-btn').classList.toggle('pick-active',pickMode==='start');$('pick-end-btn').classList.toggle('pick-active',pickMode==='end');
      const max=snap.solution?snap.solution.traversals.length:0;routeStep=clamp(routeStep,0,max);$('route-slider').max=String(max);$('route-slider').value=String(routeStep);$('route-prev-btn').disabled=routeStep<=0;$('route-next-btn').disabled=routeStep>=max;
      renderMetrics();renderWarnings();renderCanvas();
    }
    function renderMetrics(){
      const e=snap.electrical;
      const values=e?[
        ['Уникальная длина',`${fmt(e.uniqueLengthM)} м`],['Повторы',`${fmt(e.repeatLengthM)} м`],['Итого ленты',`${fmt(e.totalLengthM)} м`],['LED ≈',String(e.ledCountApprox)],['Мощность',`${fmt(e.powerW,1)} Вт`],['Ток',`${fmt(e.currentA,2)} А`],['БП ≥',`${fmt(e.recommendedPsuW,1)} Вт`],['Повтор',`${fmt(e.repeatPercent,1)}%`],['START–END',`${fmt(e.endpointSeparationM)} м`],['Сегментов',String(snap.graph.edges.length)]
      ]:[['Модули',String(snap.cells.length)],['Маршрут','—']];
      $('metrics').innerHTML=values.map(([a,b])=>`<div class="metric"><span>${escapeHtml(a)}</span><strong>${escapeHtml(b)}</strong></div>`).join('');
    }
    function renderWarnings(){const list=[...snap.warnings];if(pickMode)list.unshift(`Выберите ${pickMode==='start'?'START':'END'} среди подсвеченных нижних точек.`);$('warnings').innerHTML=list.length?`<div class="warning-box">${list.map(escapeHtml).join('<br>')}</div>`:'';}

    function line(x1,y1,x2,y2,attrs=''){return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;}
    function renderCanvas(){
      const chunks=[];
      chunks.push(`<defs><marker id="ui-arrow" markerWidth="3.5" markerHeight="3.5" refX="3" refY="1.5" orient="auto"><path d="M0,0 L0,3 L3.5,1.5 z" fill="var(--route)"/></marker></defs>`);
      chunks.push(`<g id="scene" transform="translate(${view.tx} ${view.ty}) scale(${view.scale})"><rect data-pan-bg="1" x="-5000" y="-5000" width="10000" height="10000" fill="transparent"/>`);
      const grid=HexGrid.create(snap.cells);
      if(snap.cells.length){
        for(const face of grid.freeFaces()){
          const a=center(face.owner.q,face.owner.r), b=center(face.target.q,face.target.r);
          const x=(a.x+b.x)/2, y=(a.y+b.y)/2;
          chunks.push(`<g class="add-face" data-interactive="1" data-add-face="1" data-add-q="${face.target.q}" data-add-r="${face.target.r}" role="button" tabindex="0" aria-label="Добавить модуль на эту грань"><circle class="add-face-hit" cx="${x}" cy="${y}" r="16" fill="var(--start)" fill-opacity=".92" stroke="var(--start)" stroke-width="2"/><text class="add-face-plus" x="${x}" y="${y+6}" text-anchor="middle" font-size="20" font-weight="800" fill="white" pointer-events="none">+</text></g>`);
        }
      }
      for(const e of snap.graph.edges){const a=GeometryBuilder.toWorld(snap.graph.vertices[e.u],RENDER_SIDE),b=GeometryBuilder.toWorld(snap.graph.vertices[e.v],RENDER_SIDE);chunks.push(line(a.x,a.y,b.x,b.y,`stroke="var(--corridor)" stroke-width="14" stroke-linecap="round"`));}
      const cellOrder=[...snap.cells].sort((a,b)=>a.r-b.r||a.q-b.q);cellOrder.forEach((c,i)=>{const selected=key(c.q,c.r)===snap.selectedKey;chunks.push(`<polygon data-interactive="1" data-cell-key="${key(c.q,c.r)}" points="${polygonPoints(c.q,c.r)}" fill="${selected?'var(--accent-weak)':'transparent'}" stroke="${selected?'var(--accent)':'var(--hex)'}" stroke-width="${selected?3:1.8}"/>`);if(snap.view.showNumbers){const p=center(c.q,c.r);chunks.push(`<text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--muted)" pointer-events="none">${i+1}</text>`);}});
      if(snap.solution){
        const upto=Math.min(routeStep,snap.solution.traversals.length);
        for(let i=0;i<upto;i++){const t=snap.solution.traversals[i],a=GeometryBuilder.toWorld(snap.graph.vertices[t.from],RENDER_SIDE),b=GeometryBuilder.toWorld(snap.graph.vertices[t.to],RENDER_SIDE);const color=t.repeat?'var(--repeat)':'var(--route)';const dash=t.repeat?'stroke-dasharray="10 7"':'';chunks.push(line(a.x,a.y,b.x,b.y,`stroke="${color}" stroke-width="5.5" stroke-linecap="round" ${dash} marker-end="url(#ui-arrow)"`));if(snap.view.showRouteNumbers){chunks.push(`<text x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2-5}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text)" pointer-events="none">${i+1}</text>`);}}
        if(snap.view.showDiagnostics)for(const id of snap.solution.oddVertexIds){const p=GeometryBuilder.toWorld(snap.graph.vertices[id],RENDER_SIDE);chunks.push(`<circle cx="${p.x}" cy="${p.y}" r="7" fill="none" stroke="var(--diag)" stroke-width="3"/>`);}
      }
      const lower=new Set(snap.boundary.lowerCandidateIds);for(const id of lower){const p=GeometryBuilder.toWorld(snap.graph.vertices[id],RENDER_SIDE);const active=pickMode?'1':'0';chunks.push(`<circle ${pickMode?'data-interactive="1" data-endpoint-id="'+id+'"':''} cx="${p.x}" cy="${p.y}" r="${pickMode?8:4}" fill="${pickMode?'var(--accent)':'var(--muted)'}" fill-opacity="${pickMode?.75:.35}" stroke="var(--panel)" stroke-width="2" opacity="${active==='1'?1:.55}"/>`);}
      if(snap.routing.startId!==null&&snap.graph.vertices[snap.routing.startId]){const p=GeometryBuilder.toWorld(snap.graph.vertices[snap.routing.startId],RENDER_SIDE);chunks.push(`<circle cx="${p.x}" cy="${p.y}" r="9" fill="var(--start)" stroke="var(--panel)" stroke-width="3"/><text x="${p.x+12}" y="${p.y-12}" font-size="12" font-weight="800" fill="var(--start)">START</text>`);}
      if(snap.routing.endId!==null&&snap.graph.vertices[snap.routing.endId]){const p=GeometryBuilder.toWorld(snap.graph.vertices[snap.routing.endId],RENDER_SIDE);chunks.push(`<circle cx="${p.x}" cy="${p.y}" r="9" fill="var(--end)" stroke="var(--panel)" stroke-width="3"/><text x="${p.x+12}" y="${p.y-12}" font-size="12" font-weight="800" fill="var(--end)">END</text>`);}
      if(!snap.cells.length)chunks.push(`<text x="0" y="0" text-anchor="middle" font-size="18" fill="var(--muted)" pointer-events="none">Кликните здесь или в другом месте, чтобы поставить первый модуль</text>`);
      chunks.push(`</g>`);svg.innerHTML=chunks.join('');
    }

    function fitView(){
      const fitted=computeFitTransform(snap,1000,700);
      view.scale=fitted.scale;view.tx=fitted.tx;view.ty=fitted.ty;
    }
    function clientToSvg(evt){const r=svg.getBoundingClientRect();return{x:(evt.clientX-r.left)/r.width*1000,y:(evt.clientY-r.top)/r.height*700};}
    function svgToScene(p){return{x:(p.x-view.tx)/view.scale,y:(p.y-view.ty)/view.scale};}

    svg.addEventListener('click',e=>{
      const add=e.target.closest('[data-add-face]');if(add){dispatch({type:'ADD_HEX',q:Number(add.dataset.addQ),r:Number(add.dataset.addR)},{fit:false});return;}
      const cell=e.target.closest('[data-cell-key]');if(cell){dispatch({type:'SELECT_HEX',key:cell.dataset.cellKey},{preserveStep:true});return;}
      const ep=e.target.closest('[data-endpoint-id]');if(ep&&pickMode){const type=pickMode==='start'?'SET_MANUAL_START':'SET_MANUAL_END';if(dispatch({type,vertexId:Number(ep.dataset.endpointId)})){pickMode=null;renderAll();}return;}
    });
    svg.addEventListener('keydown',e=>{
      const add=e.target.closest&&e.target.closest('[data-add-face]');
      if(add&&(e.key==='Enter'||e.key===' ')){
        e.preventDefault();
        dispatch({type:'ADD_HEX',q:Number(add.dataset.addQ),r:Number(add.dataset.addR)},{fit:false});
      }
    });
    svg.addEventListener('pointerdown',e=>{
      if(e.target.closest('[data-interactive]'))return;
      svg.setPointerCapture(e.pointerId);const p=clientToSvg(e);pointers.set(e.pointerId,p);
      if(pointers.size===1)gesture={type:'pan',start:p,tx:view.tx,ty:view.ty,moved:false};
      else if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={type:'pinch',distance:Math.hypot(a.x-b.x,a.y-b.y),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},scale:view.scale,tx:view.tx,ty:view.ty,moved:true};}
    });
    svg.addEventListener('pointermove',e=>{
      if(!pointers.has(e.pointerId))return;const p=clientToSvg(e);pointers.set(e.pointerId,p);
      if(gesture?.type==='pan'&&pointers.size===1){const dx=p.x-gesture.start.x,dy=p.y-gesture.start.y;if(Math.hypot(dx,dy)>3)gesture.moved=true;view.tx=gesture.tx+dx;view.ty=gesture.ty+dy;renderCanvas();}
      else if(pointers.size>=2){const [a,b]=[...pointers.values()].slice(0,2);const dist=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));const centerNow={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(gesture?.type!=='pinch')gesture={type:'pinch',distance:dist,center:centerNow,scale:view.scale,tx:view.tx,ty:view.ty,moved:true};const ns=clamp(gesture.scale*dist/gesture.distance,.25,4);const sceneCenter={x:(gesture.center.x-gesture.tx)/gesture.scale,y:(gesture.center.y-gesture.ty)/gesture.scale};view.scale=ns;view.tx=centerNow.x-sceneCenter.x*ns;view.ty=centerNow.y-sceneCenter.y*ns;renderCanvas();}
    });
    svg.addEventListener('pointerup',e=>{
      const p=clientToSvg(e);const was=gesture;pointers.delete(e.pointerId);
      if(pointers.size===0){if(was?.type==='pan'&&!was.moved&&!snap.cells.length){const a=axialRound(svgToScene(p).x,svgToScene(p).y);dispatch({type:'ADD_HEX',q:a.q,r:a.r},{fit:true});}gesture=null;}
    });
    svg.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);if(!pointers.size)gesture=null;});
    svg.addEventListener('wheel',e=>{e.preventDefault();const p=clientToSvg(e),scene=svgToScene(p),ns=clamp(view.scale*(e.deltaY<0?1.12:.89),.25,4);view.scale=ns;view.tx=p.x-scene.x*ns;view.ty=p.y-scene.y*ns;renderCanvas();},{passive:false});

    $('undo-btn').addEventListener('click',()=>dispatch({type:'UNDO'}));$('redo-btn').addEventListener('click',()=>dispatch({type:'REDO'}));$('delete-btn').addEventListener('click',()=>dispatch({type:'DELETE_SELECTED'}));$('clear-btn').addEventListener('click',()=>{pickMode=null;dispatch({type:'CLEAR'},{fit:true});});$('fit-btn').addEventListener('click',()=>{fitView();renderCanvas();});
    $('auto-endpoints-btn').addEventListener('click',()=>{pickMode=null;dispatch({type:'RESET_AUTO'});});$('pick-start-btn').addEventListener('click',()=>{pickMode=pickMode==='start'?null:'start';renderAll();});$('pick-end-btn').addEventListener('click',()=>{pickMode=pickMode==='end'?null:'end';renderAll();});
    $('objective-select').addEventListener('change',e=>dispatch({type:'SET_OBJECTIVE',objective:e.target.value}));
    for(const [id,field] of [['side-mm','sideMm'],['led-per-m','ledPerM'],['watts-per-m','wattsPerM'],['voltage','voltage'],['reserve-percent','reservePercent']])$(id).addEventListener('change',e=>{if(!dispatch({type:'SET_STRIP_INPUT',field,value:e.target.value}))renderAll();});
    for(const [id,flag] of [['show-numbers','showNumbers'],['show-route-numbers','showRouteNumbers'],['show-diagnostics','showDiagnostics']])$(id).addEventListener('change',e=>dispatch({type:'SET_VIEW_FLAG',flag,value:e.target.checked},{preserveStep:true}));
    $('route-prev-btn').addEventListener('click',()=>{routeStep=Math.max(0,routeStep-1);renderAll();});$('route-next-btn').addEventListener('click',()=>{routeStep=Math.min(snap.solution?.traversals.length||0,routeStep+1);renderAll();});$('route-slider').addEventListener('input',e=>{routeStep=Number(e.target.value);renderCanvas();$('route-prev-btn').disabled=routeStep<=0;$('route-next-btn').disabled=routeStep>=Number(e.target.max);});$('show-full-route-btn').addEventListener('click',()=>{routeStep=snap.solution?.traversals.length||0;renderAll();});
    $('route-animate-btn').addEventListener('click',()=>{stopAnimation();if(!snap.solution)return;if(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches){routeStep=snap.solution.traversals.length;renderAll();notify('Анимация отключена системной настройкой уменьшения движения.');return;}routeStep=0;renderAll();animation=setInterval(()=>{routeStep++;if(routeStep>=snap.solution.traversals.length)stopAnimation();renderAll();},180);});$('route-pause-btn').addEventListener('click',stopAnimation);

    function download(name,text,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    $('save-json-btn').addEventListener('click',()=>download('hex-router-project.json',ProjectIO.serialize(snap),'application/json'));
    $('load-json-input').addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;try{const text=await file.text();const parsed=ProjectIO.parse(text);if(!parsed.ok){notify(parsed.error);return;}if(dispatch({type:'LOAD_PROJECT',project:parsed.project},{fit:true}))notify('Проект загружен.');}catch(err){notify('Не удалось прочитать файл: '+err.message);}finally{e.target.value='';}});
    $('export-svg-btn').addEventListener('click',()=>{if(!snap.solution||!snap.electrical){notify('Сначала создайте конструкцию.');return;}const text=SvgExporter.export({graph:snap.graph,modules:snap.graph.modules,solution:snap.solution,startId:snap.routing.startId,endId:snap.routing.endId,showModuleNumbers:snap.view.showNumbers,showRouteNumbers:snap.view.showRouteNumbers,electrical:snap.electrical,sideMm:snap.strip.sideMm});download('hex-router-route.svg',text,'image/svg+xml');});

    const keyHandler=e=>{if(e.target.matches('input,select,textarea'))return;if(e.key==='Delete')dispatch({type:'DELETE_SELECTED'});if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();dispatch({type:e.shiftKey?'REDO':'UNDO'});}};rootElement.addEventListener('keydown',keyHandler);
    fitView();renderAll();
    return {destroy(){stopAnimation();rootElement.removeEventListener('keydown',keyHandler);rootElement.innerHTML='';}};
  }
  return {mount,computeFitTransform};
});
