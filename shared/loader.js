// Shared async loader for the search engine + datasets.
// Each variation calls `await loadXunhualingEngine()` and gets back a ready
// PoemSearchEngine instance plus stats.
(function () {
  // Capture base path NOW while document.currentScript is still us.
  const me = document.currentScript;
  const base = me && me.src ? me.src.replace(/shared\/loader\.js.*$/, '') : '';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  async function fetchJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Failed to fetch ' + url + ' — ' + r.status);
    return r.json();
  }

  let _promise = null;
  window.loadXunhualingEngine = function () {
    if (_promise) return _promise;
    _promise = (async () => {
      const data = base + 'data/';
      // Engine is loaded via <script> (it's a class); data is loaded as JSON
      // (the .js wrappers misbehave at this size in some sandboxed iframes).
      await loadScript(data + 'search-engine.js');
      const [dict, five, seven] = await Promise.all([
        fetchJson(data + 'poem-dict.json'),
        fetchJson(data + 'poem-five.json'),
        fetchJson(data + 'poem-seven.json'),
      ]);
      const engine = globalThis.poemSearchEngine;
      engine.initDict(dict);
      engine.addFiveData(five);
      engine.addSevenData(seven);
      return { engine, stats: engine.getStats() };
    })();
    return _promise;
  };
})();
