(function(root, factory) {
  const dep = typeof module === 'object' && module.exports ? require('./geometry-builder') : root.GeometryBuilder;
  const api = factory(dep);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GyverTwinkExport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(GeometryBuilder) {
  'use strict';

  const FORMAT_VERSION = 1;
  const round1 = (v) => Math.round(v * 10) / 10 + 0;

  // snapshot — состояние EditorState.snapshot(): graph, solution, routing,
  // strip, orientation и projectName. Функция не обращается к DOM.
  function build(snapshot, options = {}) {
    const { graph, solution, strip, orientation } = snapshot || {};
    if (!graph || !solution || !graph.edges.length || !solution.traversals.length) {
      return { ok: false, error: 'Сначала создайте трассируемую схему.' };
    }

    const n = strip && strip.segmentsPerEdge;
    const edgeMm = strip && strip.edgeMm;
    if (!Number.isInteger(n) || n < 1 || !(edgeMm > 0)) {
      return { ok: false, error: 'Неверные параметры ленты.' };
    }
    const repeatOffsetMm = Number.isFinite(options.repeatOffsetMm) ? options.repeatOffsetMm : 0;

    // Координаты в мм совпадают с экранной ориентацией Designer: X вправо, Y вниз.
    const world = graph.vertices.map((v) => GeometryBuilder.toWorld(v, edgeMm, orientation));
    const bounds = GeometryBuilder.worldBounds(graph, edgeMm, orientation);
    const pointFromBounds = (p) => ({ x: p.x - bounds.minX, y: p.y - bounds.minY });

    // Каждый проход добавляет свои LED строго в порядке ленты.
    const passes = new Map();
    const leds = [];
    for (const traversal of solution.traversals) {
      const A = pointFromBounds(world[traversal.from]);
      const B = pointFromBounds(world[traversal.to]);
      const pass = passes.get(traversal.edgeId) || 0;
      passes.set(traversal.edgeId, pass + 1);

      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const len = Math.hypot(dx, dy);
      const ox = pass > 0 && repeatOffsetMm > 0 ? (dy / len) * repeatOffsetMm * pass : 0;
      const oy = pass > 0 && repeatOffsetMm > 0 ? (-dx / len) * repeatOffsetMm * pass : 0;

      for (let k = 1; k <= n; k++) {
        const f = k / (n + 1);
        leds.push([
          round1(A.x + dx * f + ox),
          round1(A.y + dy * f + oy)
        ]);
      }
    }

    // Подложка содержит каждое физическое ребро ровно один раз.
    const outline = graph.edges.map((edge) => {
      const A = pointFromBounds(world[edge.u]);
      const B = pointFromBounds(world[edge.v]);
      return [round1(A.x), round1(A.y), round1(B.x), round1(B.y)];
    });

    const allPoints = leds.concat(outline.flatMap((segment) => [
      [segment[0], segment[1]],
      [segment[2], segment[3]]
    ]));
    const width = Math.max(...allPoints.map((p) => p[0]));
    const height = Math.max(...allPoints.map((p) => p[1]));

    const startId = (snapshot.routing && snapshot.routing.startId) ?? solution.vertexTrail[0];
    const endId = (snapshot.routing && snapshot.routing.endId) ?? solution.vertexTrail[solution.vertexTrail.length - 1];
    const start = pointFromBounds(world[startId]);
    const end = pointFromBounds(world[endId]);

    return {
      ok: true,
      data: {
        gyvertwink_map: FORMAT_VERSION,
        unit: 'mm',
        project: { name: typeof snapshot.projectName === 'string' ? snapshot.projectName : '' },
        led_count: leds.length,
        width_mm: round1(width),
        height_mm: round1(height),
        start: { x: round1(start.x), y: round1(start.y) },
        end: { x: round1(end.x), y: round1(end.y) },
        leds,
        outline
      }
    };
  }

  return { build, FORMAT_VERSION };
});
