(function(root){
  function installEditorControlLayout(host){
    const $=id=>host.querySelector('#'+id);
    const toolbar=host.querySelector('.toolbar'),routeControls=host.querySelector('.route-controls');
    if(!toolbar||!routeControls)return;
    const doc=host.ownerDocument||document;
    const routingActions=$('auto-endpoints-btn')?.closest('.control-grid');

    const endpointTools=doc.createElement('div');endpointTools.className='endpoint-tools phone-primary-tools';
    const fit=$('fit-btn');
    if(fit)endpointTools.appendChild(fit);
    const endpointConfig=[
      ['auto-endpoints-btn','AUTO','Автоматически выбрать START и END'],
      ['pick-start-btn','START','Назначить START'],
      ['pick-end-btn','END','Назначить END']
    ];
    for(const [id,label,description] of endpointConfig){
      const button=$(id);if(!button)continue;
      button.textContent=label;button.setAttribute('aria-label',description);button.title=description;endpointTools.appendChild(button);
    }
    const deleteButton=$('delete-btn'),clear=$('clear-btn');
    if(endpointTools.children.length){
      if(deleteButton)deleteButton.insertAdjacentElement('afterend',endpointTools);else toolbar.appendChild(endpointTools);
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

    const projectActions=host.querySelector('.project-actions');
    const projectConfig=[
      [$('save-json-btn'),'Сохранить'],
      [$('load-json-input')?.closest('.file-label'),'Открыть'],
      [$('export-gt-btn'),'GyverTwink'],
      [$('export-pdf-btn'),'PDF']
    ];
    for(const [control,label] of projectConfig){if(control)control.setAttribute('data-phone-label',label);}
    if(projectActions){for(const [control] of projectConfig){if(control)projectActions.appendChild(control);}}

    const style=doc.createElement('style');style.id='compact-editor-controls-style';style.textContent=`
      .endpoint-tools{display:flex;align-items:center;gap:7px;flex:0 1 auto}
      .endpoint-tools button{min-width:64px;padding-left:10px;padding-right:10px}
      .route-controls{grid-template-columns:auto auto minmax(80px,1fr) auto}
      .route-playback-actions{display:flex;align-items:center;gap:6px}
      .route-icon-btn{width:44px;min-width:44px;min-height:44px;padding:6px;font-size:1.15rem;line-height:1}
      @media (max-width:760px){
        .toolbar .phone-primary-tools{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;flex:1 1 100%;min-width:0}
        .toolbar .phone-primary-tools button{min-width:0;padding:6px 3px;font-size:.72rem;white-space:nowrap}
        .project-actions{width:100%;margin-left:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
        .project-actions button,.project-actions .file-label{min-width:0;padding:5px 3px;white-space:nowrap;overflow:hidden}
        .project-actions [data-phone-label]{font-size:0}
        .project-actions [data-phone-label]::after{content:attr(data-phone-label);font-size:.72rem}
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
    const gyvertwinkUi=root.GyverTwinkUI?root.GyverTwinkUI.install(host,state):null;
    installEditorControlLayout(host);
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
