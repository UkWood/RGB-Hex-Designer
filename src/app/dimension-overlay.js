(function(root,factory){
  const GB=typeof module==='object'&&module.exports?require('../core/geometry-builder'):root.GeometryBuilder;
  const api=factory(GB);
  if(typeof module==='object'&&module.exports) module.exports=api; else root.DimensionOverlay=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(GeometryBuilder){
  'use strict';
  const RENDER_SIDE=60;

  function fmtMm(value){
    if(!Number.isFinite(value)) return '—';
    return (Math.round(value*100)/100).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
  }

  function dimensionGeometry(snapshot){
    const graph=snapshot&&snapshot.graph;
    if(!graph||!Array.isArray(graph.vertices)||graph.vertices.length===0) return null;
    const orientation=snapshot.orientation||'pointy';
    const sideMm=Number(snapshot.strip&&snapshot.strip.sideMm);
    if(!Number.isFinite(sideMm)||sideMm<=0) return null;
    return {
      scene:GeometryBuilder.worldBounds(graph,RENDER_SIDE,orientation),
      mm:GeometryBuilder.worldBounds(graph,sideMm,orientation)
    };
  }

  function dimensionMarkup(snapshot){
    const geometry=dimensionGeometry(snapshot);
    if(!geometry) return '';
    const s=geometry.scene,m=geometry.mm;
    const midX=(s.minX+s.maxX)/2,midY=(s.minY+s.maxY)/2;
    const widthText=`${fmtMm(m.width)} мм`,heightText=`${fmtMm(m.height)} мм`;
    const common='text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="var(--muted)" style="paint-order:stroke;stroke:var(--canvas);stroke-width:5px;stroke-linejoin:round"';
    return `<g id="dimension-frame-layer" pointer-events="none">`+
      `<rect x="${s.minX}" y="${s.minY}" width="${s.width}" height="${s.height}" fill="none" stroke="var(--muted)" stroke-width="1" opacity=".72" vector-effect="non-scaling-stroke"/>`+
      `<text data-dimension="width-top" x="${midX}" y="${s.minY-12}" ${common}>${widthText}</text>`+
      `<text data-dimension="width-bottom" x="${midX}" y="${s.maxY+12}" ${common}>${widthText}</text>`+
      `<text data-dimension="height-left" x="${s.minX-12}" y="${midY}" ${common}>${heightText}</text>`+
      `<text data-dimension="height-right" x="${s.maxX+12}" y="${midY}" ${common}>${heightText}</text>`+
      `</g>`;
  }

  function install(host,state){
    if(!host||!state||typeof state.snapshot!=='function') return {destroy(){}};
    const help=host.querySelector('.canvas-help');
    if(help) help.remove();
    const svg=host.querySelector('#hex-canvas');
    if(!svg||typeof MutationObserver==='undefined') return {destroy(){}};
    let scheduled=false,destroyed=false;

    function render(){
      scheduled=false;
      if(destroyed) return;
      const scene=svg.querySelector('#scene');
      if(!scene||scene.querySelector('#dimension-frame-layer')) return;
      const markup=dimensionMarkup(state.snapshot());
      if(markup) scene.insertAdjacentHTML('beforeend',markup);
    }
    function schedule(){
      if(scheduled||destroyed) return;
      scheduled=true;
      queueMicrotask(render);
    }

    const observer=new MutationObserver(schedule);
    observer.observe(svg,{childList:true,subtree:true});
    render();
    return {destroy(){
      destroyed=true;
      observer.disconnect();
      const layer=svg.querySelector('#dimension-frame-layer');
      if(layer) layer.remove();
    }};
  }

  return {install,dimensionGeometry,dimensionMarkup};
});
