(function(root,factory){
  const GB=typeof module==='object'&&module.exports?require('../core/geometry-builder'):root.GeometryBuilder;
  const api=factory(GB);
  if(typeof module==='object'&&module.exports) module.exports=api; else root.DimensionOverlay=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(GeometryBuilder){
  'use strict';
  const RENDER_SIDE=60;
  function fmtMm(value){if(!Number.isFinite(value))return '—';return (Math.round(value*100)/100).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');}
  function boundsFromCenter(cx,cy,width,height){return {minX:cx-width/2,maxX:cx+width/2,minY:cy-height/2,maxY:cy+height/2,width,height};}
  function dimensionGeometry(snapshot){
    const graph=snapshot&&snapshot.graph;if(!graph||!Array.isArray(graph.vertices)||graph.vertices.length===0)return null;
    const orientation=snapshot.orientation||'pointy';
    const edgeMm=Number(snapshot.strip&&(snapshot.strip.edgeMm??snapshot.strip.sideMm));if(!Number.isFinite(edgeMm)||edgeMm<=0)return null;
    const scene=GeometryBuilder.worldBounds(graph,RENDER_SIDE,orientation),mm=GeometryBuilder.worldBounds(graph,edgeMm,orientation);
    const requiredWidthMm=Number(snapshot.requiredWidthMm),requiredHeightMm=Number(snapshot.requiredHeightMm);
    let target=null;
    if(Number.isFinite(requiredWidthMm)&&requiredWidthMm>0&&Number.isFinite(requiredHeightMm)&&requiredHeightMm>0){
      const cx=(scene.minX+scene.maxX)/2,cy=(scene.minY+scene.maxY)/2,scale=RENDER_SIDE/edgeMm;
      target={scene:boundsFromCenter(cx,cy,requiredWidthMm*scale,requiredHeightMm*scale),mm:{width:requiredWidthMm,height:requiredHeightMm}};
    }
    return {scene,mm,target};
  }
  function frameMarkup(prefix,s,m,color,opacity='.72'){
    const midX=(s.minX+s.maxX)/2,midY=(s.minY+s.maxY)/2,widthText=`${fmtMm(m.width)} мм`,heightText=`${fmtMm(m.height)} мм`;
    const common=`text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="${color}" style="paint-order:stroke;stroke:var(--canvas);stroke-width:5px;stroke-linejoin:round"`;
    return `<g data-frame="${prefix}"><rect x="${s.minX}" y="${s.minY}" width="${s.width}" height="${s.height}" fill="none" stroke="${color}" stroke-width="1" opacity="${opacity}" vector-effect="non-scaling-stroke"/>`+
      `<text data-dimension="${prefix}-width-top" x="${midX}" y="${s.minY-12}" ${common}>${widthText}</text>`+
      `<text data-dimension="${prefix}-width-bottom" x="${midX}" y="${s.maxY+12}" ${common}>${widthText}</text>`+
      `<text data-dimension="${prefix}-height-left" x="${s.minX-12}" y="${midY}" ${common}>${heightText}</text>`+
      `<text data-dimension="${prefix}-height-right" x="${s.maxX+12}" y="${midY}" ${common}>${heightText}</text></g>`;
  }
  function dimensionMarkup(snapshot){
    const geometry=dimensionGeometry(snapshot);if(!geometry)return '';
    let body=frameMarkup('actual',geometry.scene,geometry.mm,'var(--muted)');
    if(geometry.target)body+=frameMarkup('target',geometry.target.scene,geometry.target.mm,'#dc2626','1');
    return `<g id="dimension-frame-layer" pointer-events="none">${body}</g>`;
  }
  function install(host,state){
    if(!host||!state||typeof state.snapshot!=='function')return {destroy(){},refresh(){}};
    const help=host.querySelector('.canvas-help');if(help)help.remove();
    const svg=host.querySelector('#hex-canvas');if(!svg||typeof MutationObserver==='undefined')return {destroy(){},refresh(){}};
    let scheduled=false,destroyed=false;
    function render(force=false){scheduled=false;if(destroyed)return;const scene=svg.querySelector('#scene');if(!scene)return;const existing=scene.querySelector('#dimension-frame-layer');if(existing&&(force||true))existing.remove();const markup=dimensionMarkup(state.snapshot());if(markup)scene.insertAdjacentHTML('beforeend',markup);}
    function schedule(){if(scheduled||destroyed)return;scheduled=true;queueMicrotask(()=>render(false));}
    const observer=new MutationObserver(mutations=>{if(mutations.some(m=>[...m.addedNodes].some(n=>n.id==='dimension-frame-layer')))return;schedule();});observer.observe(svg,{childList:true,subtree:true});render();
    return {refresh(){render(true);},destroy(){destroyed=true;observer.disconnect();const layer=svg.querySelector('#dimension-frame-layer');if(layer)layer.remove();}};
  }
  return {install,dimensionGeometry,dimensionMarkup};
});
