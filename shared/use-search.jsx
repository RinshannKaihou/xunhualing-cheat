/* global React */
// Shared React hook used by all 3 variations.
// Owns: pattern, mustContain, mustNotContain, type. Calls the engine
// (debounced) and exposes results + stats. UI/visual layer is per-variation.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

function useXunhualingSearch() {
  const [engine, setEngine] = useState(null);
  const [stats, setStats] = useState(null);
  const [type, setType] = useState('all'); // 'all' | 'five' | 'seven'
  const [pattern, setPattern] = useState(''); // e.g. "春????????"
  const [mustContain, setMustContain] = useState([]); // string[]
  const [mustNotContain, setMustNotContain] = useState([]); // string[]
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Box count derived from type. 'all' defaults to five-box layout.
  const boxCount = type === 'seven' ? 14 : 10;

  // Reset pattern when boxCount changes (avoid mismatched-length searches).
  useEffect(() => {
    setPattern((p) => {
      if (!p) return p;
      // truncate or pad
      if (p.length === boxCount) return p;
      return '?'.repeat(boxCount);
    });
  }, [boxCount]);

  useEffect(() => {
    let cancelled = false;
    window.loadXunhualingEngine().then(({ engine, stats }) => {
      if (cancelled) return;
      setEngine(engine);
      setStats(stats);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Debounced search.
  const timer = useRef(null);
  useEffect(() => {
    if (!engine) return;
    setSearching(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const hasPattern = pattern && pattern.replace(/\?/g, '').length > 0;
      const hasMust = mustContain.length > 0;
      const hasNot = mustNotContain.length > 0;
      if (!hasPattern && !hasMust && !hasNot) {
        setResults(null);
        setSearching(false);
        return;
      }
      const r = engine.search({ type, pattern, mustContain, mustNotContain });
      setResults(r);
      setSearching(false);
    }, 200);
    return () => clearTimeout(timer.current);
  }, [engine, type, pattern, mustContain.join('|'), mustNotContain.join('|')]);

  const setBoxChar = useCallback((index, ch) => {
    setPattern((prev) => {
      const arr = (prev || '?'.repeat(boxCount)).padEnd(boxCount, '?').split('');
      arr[index] = ch || '?';
      return arr.join('');
    });
  }, [boxCount]);

  const clearAll = useCallback(() => {
    setPattern('');
    setMustContain([]);
    setMustNotContain([]);
  }, []);

  const showRandom = useCallback(() => {
    if (!engine) return;
    const r = engine.getRandom(type);
    if (r) setResults({ results: [r], count: 1, time: '0.00', _isRandom: true });
  }, [engine, type]);

  // Highlight helpers — return a Set of indices in `line` (line1 or line2)
  // that should be marked.
  const highlightFor = useCallback((line, lineOffset) => {
    const set = new Set();
    if (pattern) {
      for (let i = 0; i < line.length; i++) {
        const pi = lineOffset + i;
        if (pi < pattern.length && pattern[pi] !== '?') set.add(i);
      }
    }
    for (const ch of mustContain) {
      for (let i = 0; i < line.length; i++) {
        if (line[i] === ch) set.add(i);
      }
    }
    return set;
  }, [pattern, mustContain]);

  return {
    // state
    type, setType,
    pattern, setPattern, setBoxChar, boxCount,
    mustContain, setMustContain,
    mustNotContain, setMustNotContain,
    results, stats, loading, searching,
    // actions
    clearAll, showRandom,
    // helpers
    highlightFor,
  };
}

window.useXunhualingSearch = useXunhualingSearch;

// ---------- Pattern-box input — shared input handler -----------------------
// Each variation styles its own boxes; this hook gives them keyboard + IME.
function usePatternBoxes(boxCount, pattern, setBoxChar) {
  const [focusIdx, setFocusIdx] = useState(-1);
  const imeRef = useRef(null);
  const isComposing = useRef(false);

  const focus = (i) => {
    if (i < 0 || i >= boxCount) { setFocusIdx(-1); return; }
    setFocusIdx(i);
    if (imeRef.current) imeRef.current.focus();
  };

  const onIMEInput = (e) => {
    if (isComposing.current) return;
    const v = e.target.value;
    if (v.length > 0 && focusIdx >= 0) {
      setBoxChar(focusIdx, v.slice(-1));
      e.target.value = '';
      if (focusIdx + 1 < boxCount) setFocusIdx(focusIdx + 1);
    }
  };
  const onCompStart = () => { isComposing.current = true; };
  const onCompEnd = (e) => {
    isComposing.current = false;
    const v = e.data;
    if (v && v.length > 0 && focusIdx >= 0) {
      setBoxChar(focusIdx, v[0]);
      e.target.value = '';
      if (focusIdx + 1 < boxCount) setFocusIdx(focusIdx + 1);
    }
  };
  const onKey = (e) => {
    if (focusIdx < 0) return;
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === ' ') {
      setBoxChar(focusIdx, '');
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      focus(focusIdx - 1); e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      focus(focusIdx + 1); e.preventDefault();
    }
  };

  // Click-outside: blur.
  useEffect(() => {
    const onDocClick = (e) => {
      if (!e.target.closest('[data-pattern-boxes]') && !e.target.closest('[data-pattern-ime]')) {
        setFocusIdx(-1);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Hidden IME input — render this inside the variation.
  const imeProps = {
    ref: imeRef,
    'data-pattern-ime': true,
    type: 'text',
    autoComplete: 'off',
    style: { position: 'absolute', opacity: 0, pointerEvents: 'none', top: -1000, left: 0 },
    onInput: onIMEInput,
    onCompositionStart: onCompStart,
    onCompositionEnd: onCompEnd,
    onKeyDown: onKey,
  };

  return { focusIdx, focus, imeProps };
}

window.usePatternBoxes = usePatternBoxes;
