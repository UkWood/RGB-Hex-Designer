(function(root,factory){
  const req=typeof module==='object'&&module.exports;
  const deps=req?{GeometryBuilder:require('./geometry-builder'),DiagramRenderer:require('./diagram-renderer')}:{GeometryBuilder:root.GeometryBuilder,DiagramRenderer:root.DiagramRenderer};
  const api=factory(deps);if(req)module.exports=api;else root.PdfExporter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(deps){
  'use strict';
  const {GeometryBuilder,DiagramRenderer}=deps;
  const PAGE_W=1684,PAGE_H=1191,PDF_W=841.89,PDF_H=595.28,MARGIN=62;
  const fmt=(n,d=2)=>Number.isFinite(Number(n))?Number(Number(n).toFixed(d)).toString():'—';
  const positive=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>0;
  function safeBaseName(projectName){const raw=String(projectName??'').trim()||'Без названия';return raw.replace(/[<>:"/\\|?*\x00-\x1F]/g,'_').trim()||'Без названия';}
  function fileNameFor(projectName){return `${safeBaseName(projectName)}.pdf`;}
  function repeatedSpecRows(rows){return (rows||[]).filter(r=>Number(r.additionalPasses)>0).map(r=>({number:r.number,additionalPasses:r.additionalPasses}));}
  function asciiBytes(s){return Uint8Array.from(BufferLike.encode(String(s)));}
  const BufferLike={encode(s){if(typeof TextEncoder!=='undefined')return new TextEncoder().encode(s);const out=[];for(let i=0;i<s.length;i++)out.push(s.charCodeAt(i)&255);return out;}};
  function joinBytes(parts){let n=0;for(const p of parts)n+=p.length;const out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
  function buildImagePdf(pages){
    if(!Array.isArray(pages)||pages.length===0)throw new Error('at least one PDF page is required');
    const objects=new Map(),kids=[];
    objects.set(1,[asciiBytes('<< /Type /Catalog /Pages 2 0 R >>')]);
    for(let i=0;i<pages.length;i++)kids.push(`${3+i*3} 0 R`);
    objects.set(2,[asciiBytes(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`)]);
    for(let i=0;i<pages.length;i++){
      const page=pages[i],pageObj=3+i*3,imageObj=pageObj+1,contentObj=pageObj+2;
      const jpeg=page.jpegBytes instanceof Uint8Array?page.jpegBytes:Uint8Array.from(page.jpegBytes||[]);
      const w=Math.max(1,Math.round(Number(page.width)||1)),h=Math.max(1,Math.round(Number(page.height)||1));
      objects.set(pageObj,[asciiBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_W} ${PDF_H}] /Resources << /XObject << /Im1 ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`)]);
      objects.set(imageObj,[asciiBytes(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,asciiBytes('\nendstream')]);
      const content=asciiBytes(`q\n${PDF_W} 0 0 ${PDF_H} 0 0 cm\n/Im1 Do\nQ\n`);
      objects.set(contentObj,[asciiBytes(`<< /Length ${content.length} >>\nstream\n`),content,asciiBytes('endstream')]);
    }
    const maxObj=2+pages.length*3,parts=[asciiBytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')],offsets=Array(maxObj+1).fill(0);let length=parts[0].length;
    for(let i=1;i<=maxObj;i++){
      offsets[i]=length;const head=asciiBytes(`${i} 0 obj\n`),tail=asciiBytes('\nendobj\n');parts.push(head);length+=head.length;
      for(const p of objects.get(i)){parts.push(p);length+=p.length;}parts.push(tail);length+=tail.length;
    }
    const xrefOffset=length;let xref=`xref\n0 ${maxObj+1}\n0000000000 65535 f \n`;
    for(let i=1;i<=maxObj;i++)xref+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    xref+=`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    parts.push(asciiBytes(xref));return joinBytes(parts);
  }
  function makeCanvas(doc){const c=doc.createElement('canvas');c.width=PAGE_W;c.height=PAGE_H;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,PAGE_W,PAGE_H);ctx.textBaseline='top';return {canvas:c,ctx};}
  function drawText(ctx,text,x,y,font='28px Arial',color='#111827',align='left'){ctx.font=font;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(String(text),x,y);}
  function wrapLines(ctx,text,maxWidth){const words=String(text).split(/\s+/),lines=[];let line='';for(const word of words){const next=line?`${line} ${word}`:word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
  function drawWrapped(ctx,text,x,y,maxWidth,lineHeight,font='24px Arial',color='#374151'){ctx.font=font;ctx.fillStyle=color;ctx.textAlign='left';for(const line of wrapLines(ctx,text,maxWidth)){ctx.fillText(line,x,y);y+=lineHeight;}return y;}
  function parameters(snapshot){
    const graph=snapshot.graph,e=snapshot.electrical,strip=snapshot.strip||{},edgeMm=Number(strip.edgeMm??strip.sideMm),bounds=GeometryBuilder.worldBounds(graph,edgeMm,snapshot.orientation);
    const rw=positive(snapshot.requiredWidthMm)?fmt(snapshot.requiredWidthMm):'—',rh=positive(snapshot.requiredHeightMm)?fmt(snapshot.requiredHeightMm):'—',required=(rw==='—'&&rh==='—')?'—':`${rw} × ${rh} мм`;
    return [
      ['Фактические габариты',`${fmt(bounds.width)} × ${fmt(bounds.height)} мм`],['Требуемые габариты',required],['Ориентация',snapshot.orientation==='flat'?'горизонтальная':'вертикальная'],['Шестигранников',String(graph.modules.length)],
      ['Уникальных рёбер',String(graph.edges.length)],['Сегментов на ребро',fmt(strip.segmentsPerEdge)],['LED/м',fmt(strip.ledPerM)],['Базовая длина ребра',`${fmt(strip.baseEdgeMm)} мм`],
      ['Коррекция длины ребра',`${fmt(strip.edgeCorrectionMm)} мм`],['Итоговая длина ребра',`${fmt(edgeMm)} мм`],['Вт/м',fmt(strip.wattsPerM)],['Напряжение',`${fmt(strip.voltage)} В`],
      ['Запас БП',`${fmt(strip.reservePercent)}%`],['Повторных проходов',String(snapshot.solution.repeatCount)],['LED-лента',`${fmt(e.ledStripLengthM)} м`],['Провод повторов',`${fmt(e.repeatLengthM)} м`],
      ['Маршрут',`${fmt(e.routeLengthM)} м`],['LED',String(e.ledCount)],['Мощность',`${fmt(e.powerW)} Вт`],['Ток',`${fmt(e.currentA)} А`],['БП ≥',`${fmt(e.recommendedPsuW)} Вт`],['Доля повтора',`${fmt(e.repeatPercent)}%`],['START–END',`${fmt(e.endpointSeparationM)} м`]
    ];
  }
  function canvasJpegBytes(canvas,root){const data=canvas.toDataURL('image/jpeg',.94),base64=data.slice(data.indexOf(',')+1),bin=(root.atob||atob)(base64),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
  function svgDataUrl(svg){
    let text=String(svg);if(!/<svg\b[^>]*\bxmlns=/i.test(text))text=text.replace(/<svg\b/i,'<svg xmlns="http://www.w3.org/2000/svg"');const m=text.match(/viewBox="\s*([^\"]+)"/i);
    if(m){const nums=m[1].trim().split(/[ ,]+/).map(Number);if(nums.length===4&&nums.every(Number.isFinite)){const w=Math.abs(nums[2]),h=Math.abs(nums[3]);if(!/<svg\b[^>]*\bwidth=/i.test(text))text=text.replace(/<svg\b/i,`<svg width="${w}"`);if(!/<svg\b[^>]*\bheight=/i.test(text))text=text.replace(/<svg\b/i,`<svg height="${h}"`);}}
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  }
  async function drawSvg(ctx,svg,root,box){
    const ImageCtor=root.Image||Image,img=new ImageCtor(),url=svgDataUrl(svg);
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('failed to render SVG for PDF'));img.src=url;});
    const iw=img.naturalWidth||img.width||box.w,ih=img.naturalHeight||img.height||box.h,scale=Math.min(box.w/iw,box.h/ih),w=iw*scale,h=ih*scale;ctx.drawImage(img,box.x+(box.w-w)/2,box.y+(box.h-h)/2,w,h);
  }
  function drawTableHeader(ctx,y){ctx.fillStyle='#f3f4f6';ctx.fillRect(MARGIN,y,PAGE_W-2*MARGIN,48);ctx.strokeStyle='#9ca3af';ctx.strokeRect(MARGIN,y,PAGE_W-2*MARGIN,48);drawText(ctx,'№ ребра',MARGIN+18,y+11,'700 23px Arial');drawText(ctx,'Дополнительные проходы',MARGIN+500,y+11,'700 23px Arial');return y+48;}
  function drawTableRows(ctx,rows,y,maxRows){const take=rows.splice(0,maxRows);for(const row of take){ctx.strokeStyle='#c7cdd6';ctx.strokeRect(MARGIN,y,PAGE_W-2*MARGIN,44);drawText(ctx,row.number,MARGIN+18,y+9,'22px Arial');drawText(ctx,row.additionalPasses,MARGIN+500,y+9,'22px Arial');y+=44;}return y;}
  async function renderPages(snapshot,root){
    if(!snapshot?.solution||!snapshot?.electrical)throw new Error('routeable construction is required for PDF export');const doc=root.document;if(!doc)throw new Error('document is required for PDF export');const title=String(snapshot.projectName??'').trim()||'Без названия',pages=[];
    {
      const {canvas,ctx}=makeCanvas(doc);drawText(ctx,title,MARGIN,38,'700 42px Arial');drawText(ctx,`Ориентация: ${snapshot.orientation==='flat'?'горизонтальная':'вертикальная'}`,MARGIN,92,'22px Arial','#4b5563');await drawSvg(ctx,DiagramRenderer.render(snapshot),root,{x:MARGIN,y:130,w:PAGE_W-2*MARGIN,h:PAGE_H-180});pages.push({width:canvas.width,height:canvas.height,jpegBytes:canvasJpegBytes(canvas,root)});
    }
    const spec=repeatedSpecRows(snapshot.numbering?.specRows),params=parameters(snapshot);
    {
      const {canvas,ctx}=makeCanvas(doc);drawText(ctx,title,MARGIN,34,'700 40px Arial');drawText(ctx,'Параметры и расчёт',MARGIN,88,'700 31px Arial');const colW=(PAGE_W-2*MARGIN)/4,rowH=70;
      params.forEach(([label,value],i)=>{const col=i%4,row=Math.floor(i/4),x=MARGIN+col*colW,y=140+row*rowH;drawText(ctx,label,x,y,'20px Arial','#6b7280');drawText(ctx,value,x,y+27,'700 23px Arial');ctx.strokeStyle='#e5e7eb';ctx.beginPath();ctx.moveTo(x,y+58);ctx.lineTo(x+colW-18,y+58);ctx.stroke();});
      let y=140+Math.ceil(params.length/4)*rowH+12;const closed=snapshot.routing?.startId===snapshot.routing?.endId,connection=closed?'START / END: DATA проходит замкнутый маршрут и возвращается в ту же точку.':'DATA: START → END; +V и GND подаются с обоих концов.';y=drawWrapped(ctx,connection,MARGIN,y,PAGE_W-2*MARGIN,30,'22px Arial');y+=18;drawText(ctx,'Спецификация рёбер с дополнительными проходами',MARGIN,y,'700 29px Arial');y+=42;
      if(spec.length){y=drawTableHeader(ctx,y);drawTableRows(ctx,spec,y,Math.max(0,Math.floor((PAGE_H-MARGIN-y)/44)));}else drawText(ctx,'Дополнительных проходов нет.',MARGIN,y,'23px Arial','#4b5563');
      pages.push({width:canvas.width,height:canvas.height,jpegBytes:canvasJpegBytes(canvas,root)});
    }
    while(spec.length){const {canvas,ctx}=makeCanvas(doc);drawText(ctx,title,MARGIN,34,'700 38px Arial');drawText(ctx,'Спецификация рёбер с дополнительными проходами',MARGIN,88,'700 29px Arial');let y=138;y=drawTableHeader(ctx,y);drawTableRows(ctx,spec,y,Math.floor((PAGE_H-MARGIN-y)/44));pages.push({width:canvas.width,height:canvas.height,jpegBytes:canvasJpegBytes(canvas,root)});}
    return pages;
  }
  async function downloadPdf(snapshot,rootArg){const root=rootArg||(typeof globalThis!=='undefined'?globalThis:this),pages=await renderPages(snapshot,root),bytes=buildImagePdf(pages),BlobCtor=root.Blob||Blob,urlApi=root.URL||URL,blob=new BlobCtor([bytes],{type:'application/pdf'}),url=urlApi.createObjectURL(blob),a=root.document.createElement('a');a.href=url;a.download=fileNameFor(snapshot.projectName);a.style.display='none';root.document.body.appendChild(a);a.click();a.remove();const timer=root.setTimeout||setTimeout;timer(()=>urlApi.revokeObjectURL(url),1000);return {bytes,pageCount:pages.length,fileName:a.download};}
  return {buildImagePdf,fileNameFor,repeatedSpecRows,svgDataUrl,renderPages,downloadPdf};
});