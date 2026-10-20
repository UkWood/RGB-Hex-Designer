(function(root){
  function boot(){const host=document.getElementById('app');if(!host)return;const state=root.EditorState.create();root.HexRouterApp={state,ui:root.EditorUI.mount(host,state)};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof globalThis!=='undefined'?globalThis:this);
