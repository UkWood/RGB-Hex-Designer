(function(root){
  function installEditorControlLayout(host){
    const $=id=>host.querySelector('#'+id);
    const toolbar=host.querySelector('.toolbar'),routeControls=host.querySelector('.route-controls');
    if(!toolbar||!routeControls)return;
    const doc=host.ownerDocument||document;
    const routingActions=$('auto-endpoints-btn')?.closest('.control-grid');

    const endpointTools=doc.createElement('div');endpointTools.className='endpoint-tools';
    const endpointConfig=[
      ['auto-endpoints-btn','AUTO','Автоматически выбрать START и END'],
      ['pick-start-btn','START','Назначить START'],
      ['pick-end-btn','END','Назначить END']
    ];
    for(const [id,label,description] of endpointConfig){
      const button=$(id);if(!button)continue;
      button.textContent=label;button.setAttribute('aria-label',description);button.title=description;endpointTools.appendChild(button);
    }
    const fit=$('fit-btn'),clear=$('clear-btn');
    if(endpointTools.children.length){
      if(fit)fit.insertAdjacentElement('afterend',endpointTools);else toolbar.appendChild(endpointTools);
      if(clear)endpointTools.insertAdjacentElement('afterend',clear);
    }

    const playbackActions=doc.createElement('div');playbackActions.className='route-playback-actions';
    const playbackConfig=[
      ['route-animate-btn','⏵','Анимация маршрута'],
      ['route-pause-btn','⏸','Пауза анимации'],
      ['show-full-route-btn','⏭','Показать весь маршрут']
    ];
    for(const [id,icon,description] of playbackConfig){
      const button=$(id);if(!button)continue;
      button.classList.add('route-icon-btn');button.textContent=icon;button.setAttribute('aria-label',description);button.title=description;playbackActions.appendChild(button);
    }
    if(playbackActions.children.length)routeControls.appendChild(playbackActions);
    if(routingActions&&!routingActions.children.length)routingActions.remove();

    const style=doc.createElement('style');style.id='compact-editor-controls-style';style.textContent=`
      .endpoint-tools{display:flex;align-items:center;gap:7px;flex:0 1 auto}
      .endpoint-tools button{min-width:64px;padding-left:10px;padding-right:10px}
      .route-controls{grid-template-columns:auto auto minmax(80px,1fr) auto}
      .route-playback-actions{display:flex;align-items:center;gap:6px}
      .route-icon-btn{width:44px;min-width:44px;min-height:44px;padding:6px;font-size:1.15rem;line-height:1}
      @media (max-width:760px){
        .endpoint-tools{flex:1 1 100%}
        .endpoint-tools button{flex:1 1 0;min-width:64px}
        .route-controls{grid-template-columns:auto auto minmax(0,1fr)}
        .route-playback-actions{grid-column:1/-1;justify-self:end}
      }
    `;doc.head.appendChild(style);
  }

  function boot(){
    const host=document.getElementById('app');
    if(!host)return;
    const state=root.EditorState.create();
    const ui=root.EditorUI.mount(host,state);
    const dimensions=root.DimensionOverlay?root.DimensionOverlay.install(host,state):null;
    const v3ui=root.V3UI?root.V3UI.install(host,state):null;
    installEditorControlLayout(host);
    const gyvertwinkUi=root.GyverTwinkUI?root.GyverTwinkUI.install(host,state):null;
    const syncResponsiveDrawer=()=>{
      const shell=host.querySelector('.app-shell'),drawer=host.querySelector('#parameters-drawer');
      if(!shell||!drawer)return;
      const desktop=Number(root.innerWidth||0)>1080;
      if(desktop){shell.classList.remove('parameters-open');drawer.setAttribute('aria-hidden','false');}
      else if(!shell.classList.contains('parameters-open'))drawer.setAttribute('aria-hidden','true');
    };
    if(root.addEventListener)root.addEventListener('resize',syncResponsiveDrawer);
    syncResponsiveDrawer();
    root.HexRouterApp={state,ui,dimensions,v3ui,gyvertwinkUi};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof globalThis!=='undefined'?globalThis:this);
