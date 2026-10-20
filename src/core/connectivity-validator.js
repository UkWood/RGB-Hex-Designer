(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ConnectivityValidator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const DELTAS = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  const key = (q,r) => `${q},${r}`;

  function isConnected(cells) {
    if (!Array.isArray(cells) || cells.length === 0) return true;
    const set = new Set(cells.map(c => key(c.q,c.r)));
    const seen = new Set();
    const queue = [cells[0]];
    seen.add(key(cells[0].q,cells[0].r));
    for (let i = 0; i < queue.length; i++) {
      const c = queue[i];
      for (const [dq,dr] of DELTAS) {
        const k = key(c.q+dq,c.r+dr);
        if (set.has(k) && !seen.has(k)) {
          seen.add(k);
          const [q,r] = k.split(',').map(Number);
          queue.push({q,r});
        }
      }
    }
    return seen.size === set.size;
  }

  function canRemove(cells, targetKey) {
    if (!Array.isArray(cells) || cells.length <= 1) return false;
    const remaining = cells.filter(c => key(c.q,c.r) !== targetKey);
    if (remaining.length === cells.length) return false;
    return isConnected(remaining);
  }

  return { DELTAS, isConnected, canRemove };
});
