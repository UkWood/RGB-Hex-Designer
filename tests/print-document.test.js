const test=require('node:test');
const assert=require('node:assert/strict');
const EditorState=require('../src/app/editor-state');
const PrintDocument=require('../src/core/print-document');

function snap(){
  const s=EditorState.create();for(const [q,r] of [[0,0],[1,0],[1,1]])s.dispatch({type:'ADD_HEX',q,r});
  s.dispatch({type:'SET_PROJECT_NAME',value:'RGB / Зал №1'});s.dispatch({type:'SET_REQUIRED_DIMENSION',field:'width',value:1200});s.dispatch({type:'SET_REQUIRED_DIMENSION',field:'height',value:800});
  s.dispatch({type:'SET_STRIP_INPUT',field:'edgeCorrectionMm',value:5});s.dispatch({type:'SET_VIEW_FLAG',flag:'showEdgeNumbers',value:true});
  return s.snapshot();
}

test('print_document_is_offline_a4_landscape_with_scheme_then_parameter_page',()=>{
  const html=PrintDocument.render(snap());
  assert.match(html,/^<!doctype html>/i);assert.match(html,/@page\s*\{[^}]*size:\s*A4\s+landscape/i);
  assert.match(html,/class="page page-scheme"/);assert.match(html,/class="page page-details"/);
  assert.match(html,/break-after:\s*page|page-break-after:\s*always/);
  assert.match(html,/RGB \/ Зал №1/);assert.match(html,/Параметры и расчёт/);assert.match(html,/Спецификация рёбер/);
  assert.doesNotMatch(html,/https?:\/\//i);
});

test('parameter_grid_has_four_columns_and_all_new_edge_and_dimension_values',()=>{
  const html=PrintDocument.render(snap());
  assert.match(html,/parameter-grid/);assert.match(html,/grid-template-columns:\s*repeat\(4/);
  for(const text of ['Требуемые габариты','Фактические габариты','Сегментов на ребро','Базовая длина ребра','Коррекция длины ребра','Итоговая длина ребра','LED/м','Вт/м','Напряжение','Запас БП','Уникальная длина','Повторы','Итого ленты','Мощность','Ток','БП ≥','START–END'])assert.ok(html.includes(text),`missing ${text}`);
});

test('partial_required_dimensions_are_printed_as_values_with_missing_axis_dash_not_zero',()=>{
  const s=snap();s.requiredHeightMm=null;
  let html=PrintDocument.render(s);
  assert.match(html,/1200 × — мм/);assert.doesNotMatch(html,/1200 × 0 мм/);
  s.requiredWidthMm=null;s.requiredHeightMm=800;html=PrintDocument.render(s);
  assert.match(html,/— × 800 мм/);assert.doesNotMatch(html,/0 × 800 мм/);
  s.requiredHeightMm=null;html=PrintDocument.render(s);
  assert.match(html,/Требуемые габариты<\/span><strong>—<\/strong>/);
});

test('edge_specification_contains_only_edges_with_additional_passes',()=>{
  const s=snap();const html=PrintDocument.render(s);
  assert.match(html,/<table[^>]*class="edge-spec"/);assert.match(html,/<thead>/);assert.match(html,/display:\s*table-header-group/);assert.match(html,/break-inside:\s*avoid|page-break-inside:\s*avoid/);
  const repeated=s.numbering.specRows.filter(r=>r.additionalPasses>0);
  assert.ok(repeated.length>0,'fixture must contain repeated edges');
  assert.equal((html.match(/data-edge-row=/g)||[]).length,repeated.length);
  for(const row of s.numbering.specRows){
    const marker=new RegExp(`data-edge-row="${row.number}"`);
    if(row.additionalPasses===0)assert.doesNotMatch(html,marker,`single-pass edge ${row.number} must be omitted`);
    else {
      assert.match(html,marker);
      assert.match(html,new RegExp(`data-edge-row="${row.number}"[^>]*>[\\s\\S]*?<td>${row.number}<\\/td>[\\s\\S]*?<td>${row.additionalPasses}<\\/td>`));
    }
  }
});

test('closed_route_uses_closed_loop_connection_note',()=>{
  const s=EditorState.create();s.dispatch({type:'ADD_HEX',q:0,r:0});const id=s.snapshot().boundary.lowerCandidateIds[0];s.dispatch({type:'SET_MANUAL_START',vertexId:id});s.dispatch({type:'SET_MANUAL_END',vertexId:id});
  const html=PrintDocument.render(s.snapshot());assert.match(html,/START \/ END/);assert.match(html,/замкнут|возвращается/i);
});

test('safe_title_has_fallback_and_removes_filename_forbidden_characters',()=>{
  assert.equal(PrintDocument.safeTitle(''),'Без названия');
  assert.equal(PrintDocument.safeTitle(' A/B:C*D? '),'A_B_C_D_');
});