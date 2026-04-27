/* global React, useXunhualingSearch, usePatternBoxes */
// Variation B — Letterpress Folio 折本
// Aesthetic: large display serif, manuscript page with margins, prominent
// vermillion seal, ornamental flower mark, generous whitespace. Most "poetic".

const { useState: useStateB, useEffect: useEffectB } = React;

function FolioApp() {
  const s = useXunhualingSearch();
  const { focusIdx, focus, imeProps } = usePatternBoxes(s.boxCount, s.pattern, s.setBoxChar);

  return (
    <div className="lf-root">
      <input {...imeProps} />

      {/* Side margin marks (left rule + page number) */}
      <div className="lf-page-rule" />
      <div className="lf-folio-no">壹</div>

      <div className="lf-inner">
        {/* ===== Hero ===== */}
        <header className="lf-hero">
          <div className="lf-hero-grid">
            <div className="lf-hero-left">
              <div className="lf-kicker">
                <span className="lf-kicker-orn">❀</span>
                <span>诗 词 检 索 之 法</span>
                <span className="lf-kicker-orn">❀</span>
              </div>
              <h1 className="lf-display">
                <span className="lf-display-1">寻</span>
                <span className="lf-display-2">花</span>
                <span className="lf-display-3">令</span>
              </h1>
              <div className="lf-tagline">
                <em>Xúnhuālìng</em> &nbsp;—&nbsp; the seek-flower decree.
                <br />
                A concordance for the drinking game of Tang couplets.
              </div>
            </div>
            <div className="lf-hero-right">
              <FolioSeal />
              <div className="lf-hero-meta">
                <div>癸 卯 年 春</div>
                <div className="lf-hero-meta-en">Anno MMXXIV · Spring</div>
              </div>
            </div>
          </div>
          <div className="lf-rule-fancy">
            <span className="lf-rule-line" />
            <span className="lf-rule-orn">✦</span>
            <span className="lf-rule-line" />
          </div>
        </header>

        {/* ===== Stats ribbon ===== */}
        <section className="lf-ribbon">
          <RibbonStat label="entries · 总数" value={s.stats?.total} />
          <RibbonStat label="五言 · pent." value={s.stats?.five} />
          <RibbonStat label="七言 · hept." value={s.stats?.seven} />
          <RibbonStat label="characters · 字" value={s.stats?.uniqueChars} />
        </section>

        {/* ===== Composition area ===== */}
        <section className="lf-compose">
          <div className="lf-compose-head">
            <div className="lf-compose-eyebrow">i.</div>
            <h2 className="lf-h2">Compose the Couplet</h2>
            <div className="lf-compose-zh">摹写一联</div>
          </div>

          {/* Type tabs */}
          <div className="lf-tabs">
            {[
              ['all', '全部 · all'],
              ['five', '五言 · five'],
              ['seven', '七言 · seven'],
            ].map(([v, label]) => (
              <button
                key={v}
                className={`lf-tab ${s.type === v ? 'is-on' : ''}`}
                onClick={() => s.setType(v)}
              >{label}</button>
            ))}
          </div>

          {/* Manuscript grid */}
          <div className="lf-manuscript">
            <ManuscriptGrid
              boxCount={s.boxCount}
              pattern={s.pattern}
              focusIdx={focusIdx}
              focus={focus}
            />
            <div className="lf-manuscript-actions">
              <button className="lf-quiet" onClick={() => s.setPattern('')}>清&nbsp;空</button>
              <span className="lf-quiet-sep">·</span>
              <button className="lf-quiet" onClick={() => s.setPattern('春' + '?'.repeat(s.boxCount - 1))}>春□□□…</button>
              <span className="lf-quiet-sep">·</span>
              <button className="lf-quiet" onClick={() => s.setPattern('?'.repeat(s.boxCount - 2) + '明月')}>□…明月</button>
              <span className="lf-quiet-sep">·</span>
              <button className="lf-quiet" onClick={s.showRandom}>随&nbsp;机 · random</button>
            </div>
          </div>

          {/* Filters */}
          <div className="lf-filters">
            <FilterField
              label="必含" labelEn="must include"
              accent="ochre"
              value={s.mustContain}
              onChange={s.setMustContain}
              placeholder="characters separated by space"
            />
            <FilterField
              label="排除" labelEn="must exclude"
              accent="sage"
              value={s.mustNotContain}
              onChange={s.setMustNotContain}
              placeholder="characters separated by space"
            />
          </div>
        </section>

        {/* ===== Results ===== */}
        <section className="lf-results">
          <div className="lf-compose-head">
            <div className="lf-compose-eyebrow">ii.</div>
            <h2 className="lf-h2">Matched Couplets</h2>
            <div className="lf-compose-zh">所得诗联</div>
            <div className="lf-results-meta">
              {s.loading ? <span className="lf-muted">— loading concordance —</span>
                : <FolioMeta r={s.results} />}
            </div>
          </div>

          <FolioResults search={s} />
        </section>

        {/* ===== Colophon ===== */}
        <footer className="lf-end">
          <div className="lf-end-orn">❦</div>
          <div className="lf-end-text">
            ex libris · 馆藏目录 · folio edition · set in Source Han Serif & EB Garamond
          </div>
        </footer>
      </div>
    </div>
  );
}

// ===== Subcomponents ========================================================

function RibbonStat({ label, value }) {
  return (
    <div className="lf-ribbon-stat">
      <div className="lf-ribbon-value">{value ? value.toLocaleString() : '—'}</div>
      <div className="lf-ribbon-label">{label}</div>
    </div>
  );
}

function ManuscriptGrid({ boxCount, pattern, focusIdx, focus }) {
  const splitAt = boxCount === 14 ? 7 : 5;
  const chars = (pattern || '?'.repeat(boxCount)).padEnd(boxCount, '?').split('');
  const cells = [];
  for (let i = 0; i < boxCount; i++) {
    if (i === splitAt) {
      cells.push(
        <div key={'br' + i} className="lf-grid-break" aria-hidden>
          <span>，</span>
        </div>
      );
    }
    const ch = chars[i];
    const empty = ch === '?';
    cells.push(
      <button
        key={i}
        type="button"
        className={`lf-cell ${empty ? 'is-empty' : 'is-filled'} ${focusIdx === i ? 'is-focus' : ''}`}
        onClick={() => focus(i)}
      >
        <span className="lf-cell-tick">{i === splitAt - 1 || i === boxCount - 1 ? '' : ''}</span>
        {empty ? null : <span className="lf-cell-char">{ch}</span>}
      </button>
    );
  }
  return <div className="lf-grid" data-pattern-boxes>{cells}</div>;
}

function FilterField({ label, labelEn, accent, value, onChange, placeholder }) {
  const [text, setText] = useStateB('');
  useEffectB(() => { setText(value.join(' ')); }, [value.join('|')]);
  return (
    <div className={`lf-filter lf-filter-${accent}`}>
      <div className="lf-filter-label">
        <div className="lf-filter-zh">{label}</div>
        <div className="lf-filter-en">{labelEn}</div>
      </div>
      <input
        type="text"
        className="lf-filter-input"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          const parts = e.target.value.split(/[\s,，、]+/).filter(Boolean);
          onChange(parts);
        }}
        autoComplete="off"
      />
      {value.length > 0 && (
        <div className="lf-filter-chips">
          {value.map((c, i) => <span key={i} className="lf-filter-chip">{c}</span>)}
        </div>
      )}
    </div>
  );
}

function FolioMeta({ r }) {
  if (!r) return <span className="lf-muted">— enter a query to begin —</span>;
  return (
    <span>
      <b>{r.count.toLocaleString()}</b> matched · <span className="lf-muted">{r.time}ms</span>
    </span>
  );
}

function FolioResults({ search }) {
  const { results, loading, highlightFor } = search;
  if (loading) {
    return (
      <div className="lf-blank">
        <div className="lf-blank-orn">⌛</div>
        <div className="lf-blank-text">— loading concordance —</div>
      </div>
    );
  }
  if (!results) {
    return (
      <div className="lf-blank">
        <div className="lf-blank-orn">❀</div>
        <div className="lf-blank-text">
          Compose a pattern in the manuscript above, or specify <em>must&nbsp;include</em> / <em>exclude</em> below — or press <button className="lf-blank-link" onClick={search.showRandom}>random</button> for a couplet.
        </div>
      </div>
    );
  }
  if (results.count === 0) {
    return (
      <div className="lf-blank">
        <div className="lf-blank-orn">∅</div>
        <div className="lf-blank-text">no couplet matches the constraints.</div>
      </div>
    );
  }
  return (
    <div className="lf-couplet-list">
      {results.results.map((r, idx) => (
        <article key={r.type + r.id} className="lf-couplet">
          <div className="lf-couplet-marker">
            <div className="lf-couplet-num">{(idx + 1).toString().padStart(2, '0')}</div>
            <div className="lf-couplet-type">{r.type}</div>
          </div>
          <div className="lf-couplet-body">
            <div className="lf-couplet-text">
              <Highlighted text={r.line1} hl={highlightFor(r.line1, 0)} />
              <span className="lf-couplet-comma">，</span>
              <Highlighted text={r.line2} hl={highlightFor(r.line2, r.line1.length)} />
              <span className="lf-couplet-period">。</span>
            </div>
            <div className="lf-couplet-attr">
              <span className="lf-attr-author">{r.author}</span>
              <span className="lf-attr-bar">|</span>
              <span className="lf-attr-title">《{r.title}》</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Highlighted({ text, hl }) {
  if (!hl || hl.size === 0) return <span>{text}</span>;
  return (
    <span>
      {text.split('').map((c, i) =>
        hl.has(i) ? <mark key={i} className="lf-mark">{c}</mark> : <span key={i}>{c}</span>
      )}
    </span>
  );
}

function FolioSeal() {
  // Square 印章 — three characters 寻花令 stacked top→bottom, a tiny
  // floral mark in the bottom-right cell. SVG filter gives it the rough,
  // hand-stamped vermillion look.
  return (
    <svg className="lf-seal" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="lf-seal-rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
      </defs>
      <g filter="url(#lf-seal-rough)">
        {/* Outer + inner double frame */}
        <rect x="6" y="6" width="108" height="108" fill="none" stroke="#8b1a1a" strokeWidth="4" />
        <rect x="12" y="12" width="96" height="96" fill="none" stroke="#8b1a1a" strokeWidth="1.2" />
        {/* 2x2 cells */}
        <line x1="60" y1="14" x2="60" y2="106" stroke="#8b1a1a" strokeWidth="1" opacity="0.6" />
        <line x1="14" y1="60" x2="106" y2="60" stroke="#8b1a1a" strokeWidth="1" opacity="0.6" />
        <text x="36" y="50" textAnchor="middle" fill="#8b1a1a"
              fontFamily="Noto Serif SC, STSong, serif" fontSize="36" fontWeight="700">寻</text>
        <text x="84" y="50" textAnchor="middle" fill="#8b1a1a"
              fontFamily="Noto Serif SC, STSong, serif" fontSize="36" fontWeight="700">花</text>
        <text x="36" y="96" textAnchor="middle" fill="#8b1a1a"
              fontFamily="Noto Serif SC, STSong, serif" fontSize="36" fontWeight="700">令</text>
        {/* Small floral mark in bottom-right cell */}
        <g transform="translate(84 84)">
          <circle r="3" fill="#8b1a1a" />
          <circle r="7" fill="none" stroke="#8b1a1a" strokeWidth="1" />
          <g stroke="#8b1a1a" strokeWidth="1" fill="none">
            {[0, 60, 120, 180, 240, 300].map((d) => (
              <line key={d} x1="0" y1="0" x2="0" y2="-12"
                    transform={`rotate(${d})`} />
            ))}
          </g>
        </g>
      </g>
    </svg>
  );
}

window.FolioApp = FolioApp;
