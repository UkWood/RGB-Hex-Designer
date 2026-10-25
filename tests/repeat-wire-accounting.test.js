const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('editor metrics distinguish LED strip from repeat jumper wire',()=>{
  const source=read('src/app/editor-ui.js');
  assert.match(source,/LED-лента/);
  assert.match(source,/Провод повторов/);
  assert.match(source,/Маршрут/);
  assert.match(source,/e\.ledStripLengthM/);
  assert.match(source,/e\.routeLengthM/);
  assert.match(source,/e\.ledCount/);
  assert.doesNotMatch(source,/Итого ленты/);
  assert.doesNotMatch(source,/LED ≈/);
});

test('PDF and SVG summaries use exact LED and wire-only repeat terminology',()=>{
  for(const file of ['src/core/pdf-exporter.js','src/core/svg-exporter.js']){
    const source=read(file);
    assert.match(source,/LED-лента/);
    assert.match(source,/Провод повторов/);
    assert.match(source,/Маршрут/);
    assert.match(source,/ledStripLengthM/);
    assert.match(source,/routeLengthM/);
    assert.match(source,/ledCount/);
    assert.doesNotMatch(source,/Итого ленты/);
    assert.doesNotMatch(source,/LED ≈/);
  }
});

test('GyverTwink UI no longer requests a repeat-pass LED offset',()=>{
  const source=read('src/app/gyvertwink-ui.js');
  assert.doesNotMatch(source,/repeatOffsetMm/);
  assert.doesNotMatch(source,/GYVERTWINK_REPEAT_OFFSET_MM/);
});
