const test=require('node:test');
const assert=require('node:assert/strict');
const PdfExporter=require('../src/core/pdf-exporter');
const EditorState=require('../src/app/editor-state');

function mockPdfRoot(){
  const pages=[];
  const document={
    createElement(tag){
      assert.equal(tag,'canvas');
      const labels=[];
      pages.push(labels);
      const ctx={
        fillStyle:'',strokeStyle:'',font:'',textBaseline:'top',textAlign:'left',
        fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},drawImage(){},
        measureText(text){return {width:String(text).length*12};},
        fillText(text){labels.push(String(text));}
      };
      return {width:0,height:0,getContext(){return ctx;},toDataURL(){return 'data:image/jpeg;base64,/9j/2Q==';}};
    }
  };
  class FakeImage{
    naturalWidth=600;naturalHeight=400;
    set src(_url){queueMicrotask(()=>this.onload?.());}
  }
  return {root:{document,Image:FakeImage,atob},pages};
}

function exampleSnapshot(){
  const state=EditorState.create();
  for(const [q,r] of [[0,0],[1,0],[1,1]])assert.equal(state.dispatch({type:'ADD_HEX',q,r}).ok,true);
  return state.snapshot();
}

test('strip assembly runs follow route order and break on repeated wire traversals',()=>{
  const ts=[false,false,false,true,true,false,false,true,false].map((repeat,edgeId)=>({edgeId,repeat}));
  assert.deepEqual(PdfExporter.stripAssemblyRows(ts),[
    {number:1,edgeCount:3,firstEdgeNumber:1,lastEdgeNumber:3},
    {number:2,edgeCount:2,firstEdgeNumber:4,lastEdgeNumber:5},
    {number:3,edgeCount:1,firstEdgeNumber:6,lastEdgeNumber:6}
  ]);
});

test('strip assembly does not introduce empty groups around repeated wires',()=>{
  assert.deepEqual(PdfExporter.stripAssemblyRows([]),[]);
  assert.deepEqual(PdfExporter.stripAssemblyRows([{repeat:false},{repeat:false}]),[
    {number:1,edgeCount:2,firstEdgeNumber:1,lastEdgeNumber:2}
  ]);
  assert.deepEqual(PdfExporter.stripAssemblyRows([true,true,false,true,true,false,true].map(repeat=>({repeat}))),[
    {number:1,edgeCount:1,firstEdgeNumber:1,lastEdgeNumber:1},
    {number:2,edgeCount:1,firstEdgeNumber:2,lastEdgeNumber:2}
  ]);
});

test('real routed graph partitions all physical RGB strip edges exactly once',()=>{
  const s=exampleSnapshot();
  assert.ok(s.solution.repeatCount>0,'fixture must contain connector-wire passes');
  const runs=PdfExporter.stripAssemblyRows(s.solution.traversals);
  assert.ok(runs.length>1,'fixture must have more than one continuous strip run');
  assert.equal(runs.reduce((sum,row)=>sum+row.edgeCount,0),s.graph.edges.length);
  assert.equal(runs[0].firstEdgeNumber,1);
  assert.equal(runs.at(-1).lastEdgeNumber,s.graph.edges.length);
});

test('downloadable PDF contains separate assembly worksheet with ordered counts and schematic edge range',async()=>{
  const snapshot=exampleSnapshot();
  const {root,pages:drawn}=mockPdfRoot();
  const pdfPages=await PdfExporter.renderPages(snapshot,root);
  assert.equal(pdfPages.length,3,'schematic, existing parameters/specification and new worksheet');
  assert.equal(drawn.length,pdfPages.length);
  const worksheet=drawn.at(-1).join(' | ');
  assert.match(worksheet,/Ведомость составных участков RGB-ленты/);
  assert.match(worksheet,/Количество участков ленты/);
  assert.match(worksheet,/Рёбра на схеме/);
  assert.match(worksheet,/Всего составных участков:/);
  const runs=PdfExporter.stripAssemblyRows(snapshot.solution.traversals);
  assert.ok(worksheet.includes(String(runs.length)));
  assert.ok(worksheet.includes(String(snapshot.graph.edges.length)));
});

test('assembly worksheet paginates long runs without dropping rows',()=>{
  const rows=Array.from({length:47},(_,index)=>({
    number:index+1,edgeCount:1,firstEdgeNumber:index+1,lastEdgeNumber:index+1
  }));
  const {root,pages:drawn}=mockPdfRoot();
  const pages=PdfExporter.renderAssemblyPages(rows,'Тестовый проект',root);
  assert.equal(pages.length,3);
  assert.equal(drawn.length,3);
  assert.match(drawn[0].join(' | '),/Лист 1 из 3/);
  assert.match(drawn[1].join(' | '),/Лист 2 из 3/);
  assert.match(drawn[2].join(' | '),/Лист 3 из 3/);
  assert.equal(drawn.flat().filter(x=>/^№ 47$/.test(x)).length,1);
});
