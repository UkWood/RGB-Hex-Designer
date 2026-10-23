(function(root){
  function boot(){
    const host=document.getElementById('app');
    if(!host)return;
    const state=root.EditorState.create();
    const ui=root.EditorUI.mount(host,state);
    const dimensions=root.DimensionOverlay?root.DimensionOverlay.install(host,state):null;
    const v3ui=root.V3UI?root.V3UI.install(host,state):null;
    const syncResponsiveDrawer=()=>{
      const shell=host.querySelector('.app-shell'),drawer=host.querySelector('#parameters-drawer');
      if(!shell||!drawer)return;
      const desktop=Number(root.innerWidth||0)>1080;
      if(desktop){shell.classList.remove('parameters-open');drawer.setAttribute('aria-hidden','false');}
      else if(!shell.classList.contains('parameters-open'))drawer.setAttribute('aria-hidden','true');
    };
    root.addEventListener?.('resize',syncResponsiveDrawer);
    syncResponsiveDrawer();
    root.HexRouterApp={state,ui,dimensions,v3ui};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof globalThis!=='undefined'?globalThis:this);
