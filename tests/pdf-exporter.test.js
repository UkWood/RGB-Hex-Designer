const test=require('node:test');
const assert=require('node:assert/strict');
const PdfExporter=require('../src/core/pdf-exporter');

test('image_pdf_builder_returns_valid_pdf_header_catalog_pages_and_eof',()=>{
  const jpeg=Uint8Array.from([0xff,0xd8,0xff,0xd9]);
  const pdf=PdfExporter.buildImagePdf([{width:100,height:80,jpegBytes:jpeg},{width:100,height:80,jpegBytes:jpeg}]);
  assert.ok(pdf instanceof Uint8Array);
  const ascii=Buffer.from(pdf).toString('latin1');
  assert.ok(ascii.startsWith('%PDF-1.4'));
  assert.match(ascii,/\/Type \/Catalog/);
  assert.match(ascii,/\/Count 2/);
  assert.match(ascii,/\/Filter \/DCTDecode/);
  assert.match(ascii,/xref/);
  assert.match(ascii,/%%EOF\s*$/);
});

test('file_name_is_safe_and_has_pdf_extension',()=>{
  assert.equal(PdfExporter.fileNameFor(''),'Без названия.pdf');
  assert.equal(PdfExporter.fileNameFor(' RGB / Зал №1 '),'RGB _ Зал №1.pdf');
});

test('specification_rows_include_only_edges_with_additional_passes',()=>{
  const rows=PdfExporter.repeatedSpecRows([{number:1,additionalPasses:0},{number:2,additionalPasses:1},{number:3,additionalPasses:2}]);
  assert.deepEqual(rows,[{number:2,additionalPasses:1},{number:3,additionalPasses:2}]);
});

test('svg_for_canvas_is_encoded_as_self_contained_data_url_with_intrinsic_viewbox_size',()=>{
  const url=PdfExporter.svgDataUrl('<svg viewBox="0 0 400 200"><text>Тест</text></svg>');
  assert.match(url,/^data:image\/svg\+xml;charset=utf-8,/);
  const decoded=decodeURIComponent(url.slice(url.indexOf(',')+1));
  assert.match(decoded,/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(decoded,/width="400"/);
  assert.match(decoded,/height="200"/);
  assert.match(decoded,/viewBox="0 0 400 200"/);
});
