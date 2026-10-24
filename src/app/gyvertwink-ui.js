(function(root,factory){
  const req=typeof module==='object'&&module.exports;
  const dep=req?require('../core/gyvertwink-export'):root.GyverTwinkExport;
  const api=factory(dep,root);
  if(req)module.exports=api;else root.GyverTwinkUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(GyverTwinkExport,Root){
  'use strict';

  // Небольшой визуальный разнос повторных проходов по дополнительному
  // требованию к экспорту: порядок LED и физический маршрут не меняются.
  const GYVERTWINK_REPEAT_OFFSET_MM=1;

  function install(host,state){
    if(!host||!state||!GyverTwinkExport)return {destroy(){}};
    const save=host.querySelector('#save-json-btn');
    if(!save)return {destroy(){}};

    const doc=host.ownerDocument||Root.document;
    let button=host.querySelector('#export-gt-btn');
    if(!button){
      button=doc.createElement('button');
      button.id='export-gt-btn';
      button.type='button';
      button.textContent='Экспорт для GyverTwink';
      save.insertAdjacentElement('afterend',button);
    }

    function notify(text){
      const el=host.querySelector('#canvas-toast');
      if(!el)return;
      el.textContent=text;
      el.classList.remove('hidden');
      const timer=Root.setTimeout||setTimeout;
      timer(()=>el.classList.add('hidden'),2800);
    }

    function download(name,text,type){
      const BlobCtor=Root.Blob||Blob;
      const UrlApi=Root.URL||URL;
      const blob=new BlobCtor([text],{type});
      const url=UrlApi.createObjectURL(blob);
      const a=doc.createElement('a');
      a.href=url;
      a.download=name;
      doc.body.appendChild(a);
      a.click();
      a.remove();
      const timer=Root.setTimeout||setTimeout;
      timer(()=>UrlApi.revokeObjectURL(url),1000);
    }

    const onExport=()=>{
      const result=GyverTwinkExport.build(state.snapshot(),{repeatOffsetMm:GYVERTWINK_REPEAT_OFFSET_MM});
      if(!result.ok){
        notify(result.error||'Сначала создайте трассируемую схему.');
        return;
      }
      download('gyvertwink-map.json',JSON.stringify(result.data),'application/json');
    };

    button.addEventListener('click',onExport);
    return {destroy(){button.removeEventListener('click',onExport);button.remove();}};
  }

  return {install,GYVERTWINK_REPEAT_OFFSET_MM};
});
