(function(root){
  function boot(){
    const host=document.getElementById('app');
    if(!host)return;
    const state=root.EditorState.create();
    const ui=root.EditorUI.mount(host,state);
    const dimensions=root.DimensionOverlay?root.DimensionOverlay.install(host,state):null;
    const v3ui=root.V3UI?root.V3UI.install(host,state):null;
    root.HexRouterApp={state,ui,dimensions,v3ui};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof globalThis!=='undefined'?globalThis:this);
