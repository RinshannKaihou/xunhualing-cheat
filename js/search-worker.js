/**
 * 寻花令金手指 - Web Worker 搜索引擎
 * 在后台线程中执行数据解析、索引构建和搜索
 */

// === State ===
let fiveText = '';      // 五言文本块，每10字符一条记录
let sevenText = '';     // 七言文本块，每14字符一条记录
let fiveAuthorIds = null;  // Uint16Array
let fiveTitleIds = null;   // Uint16Array
let sevenAuthorIds = null; // Uint16Array
let sevenTitleIds = null;  // Uint16Array
let authors = [];       // 作者字典
let titles = [];        // 标题字典
let fiveCount = 0;
let sevenCount = 0;

// 倒排索引: char -> Set<recordIndex>
let fiveIndex = new Map();
let sevenIndex = new Map();

const MAX_RESULTS = 200;

// === Message Handler ===
self.onmessage = function(e) {
    const msg = e.data;
    switch (msg.type) {
        case 'init':
            handleInit(msg);
            break;
        case 'search':
            handleSearch(msg);
            break;
        case 'random':
            handleRandom(msg);
            break;
        case 'stats':
            handleStats(msg);
            break;
    }
};

// === Initialization ===
function handleInit(msg) {
    const startTime = performance.now();

    self.postMessage({ type: 'init-progress', stage: '解析字典数据', percent: 10 });

    // Parse dictionaries
    authors = msg.dict.a;
    titles = msg.dict.t;

    self.postMessage({ type: 'init-progress', stage: '解析五言数据', percent: 20 });

    // Parse five-char data
    fiveText = msg.five.t;
    fiveCount = fiveText.length / 10;
    fiveAuthorIds = parseCSVToUint16(msg.five.a, fiveCount);
    fiveTitleIds = parseCSVToUint16(msg.five.i, fiveCount);

    self.postMessage({ type: 'init-progress', stage: '解析七言数据', percent: 40 });

    // Parse seven-char data
    sevenText = msg.seven.t;
    sevenCount = sevenText.length / 14;
    sevenAuthorIds = parseCSVToUint16(msg.seven.a, sevenCount);
    sevenTitleIds = parseCSVToUint16(msg.seven.i, sevenCount);

    self.postMessage({ type: 'init-progress', stage: '构建搜索索引', percent: 60 });

    // Build inverted indices
    fiveIndex = buildInvertedIndex(fiveText, 10, fiveCount);

    self.postMessage({ type: 'init-progress', stage: '构建搜索索引', percent: 80 });

    sevenIndex = buildInvertedIndex(sevenText, 14, sevenCount);

    const elapsed = (performance.now() - startTime).toFixed(0);

    self.postMessage({
        type: 'init-done',
        stats: {
            total: fiveCount + sevenCount,
            five: fiveCount,
            seven: sevenCount,
            uniqueChars: fiveIndex.size + sevenIndex.size,
            initTime: elapsed
        }
    });
}

function parseCSVToUint16(csv, expectedLength) {
    const arr = new Uint16Array(expectedLength);
    let idx = 0;
    let num = 0;
    for (let i = 0; i < csv.length; i++) {
        const ch = csv.charCodeAt(i);
        if (ch === 44) { // comma
            arr[idx++] = num;
            num = 0;
        } else {
            num = num * 10 + (ch - 48);
        }
    }
    if (idx < expectedLength) {
        arr[idx] = num;
    }
    return arr;
}

function buildInvertedIndex(text, charWidth, count) {
    const index = new Map();
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const recordIdx = Math.floor(i / charWidth);
        let set = index.get(ch);
        if (!set) {
            set = new Set();
            index.set(ch, set);
        }
        set.add(recordIdx);
    }
    return index;
}

// === Search ===
function handleSearch(msg) {
    const startTime = performance.now();
    const params = msg.params;
    const results = [];
    let totalCount = 0;

    // Determine which groups to search
    const searchFive = params.type !== 'seven';
    const searchSeven = params.type !== 'five';

    if (searchFive) {
        const r = searchGroup(fiveText, 10, fiveCount, fiveIndex, fiveAuthorIds, fiveTitleIds, '五言', params);
        totalCount += r.count;
        results.push(...r.results);
    }

    if (searchSeven) {
        const r = searchGroup(sevenText, 14, sevenCount, sevenIndex, sevenAuthorIds, sevenTitleIds, '七言', params);
        totalCount += r.count;
        results.push(...r.results);
    }

    // Sort by score and take top MAX_RESULTS
    results.sort((a, b) => b._score - a._score);
    const topResults = results.slice(0, MAX_RESULTS).map(r => {
        const { _score, ...rest } = r;
        return rest;
    });

    const elapsed = (performance.now() - startTime).toFixed(2);

    self.postMessage({
        type: 'search-result',
        id: msg.id,
        results: topResults,
        count: totalCount,
        time: elapsed
    });
}

function searchGroup(text, charWidth, count, index, authorIds, titleIds, typeName, params) {
    const { pattern, mustContain, mustNotContain } = params;
    const hasPattern = pattern && pattern.trim() && pattern.includes('?') === false
        ? true
        : (pattern && pattern.trim() ? true : false);
    const hasMustContain = mustContain && mustContain.length > 0;
    const hasMustNotContain = mustNotContain && mustNotContain.length > 0;

    // If no search criteria, return count but don't materialize all results
    if (!hasPattern && !hasMustContain && !hasMustNotContain) {
        // Return a sample of results for display
        const sampleResults = [];
        const step = Math.max(1, Math.floor(count / MAX_RESULTS));
        for (let i = 0; i < count && sampleResults.length < MAX_RESULTS; i += step) {
            sampleResults.push(materialize(text, charWidth, i, authorIds, titleIds, typeName, 0));
        }
        return { count, results: sampleResults };
    }

    // Start with candidate set
    let candidates = null; // null means "all records"

    // Filter by mustContain using inverted index
    if (hasMustContain) {
        for (const ch of mustContain) {
            if (!ch || !ch.trim()) continue;
            const charSet = index.get(ch);
            if (!charSet || charSet.size === 0) {
                return { count: 0, results: [] };
            }
            if (candidates === null) {
                candidates = new Set(charSet);
            } else {
                // Intersect
                const newCandidates = new Set();
                for (const idx of candidates) {
                    if (charSet.has(idx)) newCandidates.add(idx);
                }
                candidates = newCandidates;
            }
            if (candidates.size === 0) return { count: 0, results: [] };
        }
    }

    // Filter by mustNotContain using inverted index
    if (hasMustNotContain) {
        const excludeSet = new Set();
        for (const ch of mustNotContain) {
            if (!ch || !ch.trim()) continue;
            const charSet = index.get(ch);
            if (charSet) {
                for (const idx of charSet) excludeSet.add(idx);
            }
        }
        if (excludeSet.size > 0) {
            if (candidates === null) {
                candidates = new Set();
                for (let i = 0; i < count; i++) {
                    if (!excludeSet.has(i)) candidates.add(i);
                }
            } else {
                for (const idx of excludeSet) candidates.delete(idx);
            }
        }
    }

    // Pattern matching
    let regex = null;
    if (hasPattern) {
        // Check pattern length matches this group's char width
        if (pattern.length !== charWidth) {
            // Pattern length doesn't match this group, skip entirely
            return { count: 0, results: [] };
        }
        const regexStr = pattern
            .replace(/\?/g, '\x01')
            .replace(/[.*+^${}()|[\]\\]/g, '\\$&')
            .replace(/\x01/g, '[\\s\\S]');
        regex = new RegExp(`^${regexStr}$`);
    }

    // Iterate candidates and apply pattern filter
    const results = [];
    let totalCount = 0;

    if (candidates !== null) {
        for (const idx of candidates) {
            if (regex) {
                const offset = idx * charWidth;
                const combined = text.slice(offset, offset + charWidth);
                if (!regex.test(combined)) continue;
            }
            totalCount++;
            const score = calculateScore(text, charWidth, idx, params);
            results.push(materialize(text, charWidth, idx, authorIds, titleIds, typeName, score));
            // Keep results bounded during collection
            if (results.length > MAX_RESULTS * 2) {
                results.sort((a, b) => b._score - a._score);
                results.length = MAX_RESULTS;
            }
        }
    } else {
        // No index filtering, scan all records
        for (let idx = 0; idx < count; idx++) {
            if (regex) {
                const offset = idx * charWidth;
                const combined = text.slice(offset, offset + charWidth);
                if (!regex.test(combined)) continue;
            }
            totalCount++;
            const score = calculateScore(text, charWidth, idx, params);
            results.push(materialize(text, charWidth, idx, authorIds, titleIds, typeName, score));
            if (results.length > MAX_RESULTS * 2) {
                results.sort((a, b) => b._score - a._score);
                results.length = MAX_RESULTS;
            }
        }
    }

    return { count: totalCount, results };
}

function calculateScore(text, charWidth, idx, params) {
    let score = 0;
    const offset = idx * charWidth;

    // Pattern match score (higher weight)
    if (params.pattern && params.pattern.trim()) {
        let matches = 0;
        let total = 0;
        for (let i = 0; i < params.pattern.length && i < charWidth; i++) {
            total++;
            if (params.pattern[i] !== '?' && params.pattern[i] === text[offset + i]) {
                matches++;
            }
        }
        score += (total > 0 ? matches / total : 0) * 10;
    }

    // Must-contain score
    if (params.mustContain && params.mustContain.length > 0) {
        const combined = text.slice(offset, offset + charWidth);
        let matches = 0;
        for (const ch of params.mustContain) {
            if (ch && combined.includes(ch)) matches++;
        }
        score += (matches / params.mustContain.length) * 5;
    }

    return score;
}

function materialize(text, charWidth, idx, authorIds, titleIds, typeName, score) {
    const offset = idx * charWidth;
    const splitAt = charWidth / 2; // 5 for five-char, 7 for seven-char
    // Note: charWidth is always even (10 or 14), so this works
    // Actually for 五言: split at 5 (line1=5, line2=5)
    // For 七言: split at 7 (line1=7, line2=7)

    return {
        id: idx,
        type: typeName,
        line1: text.slice(offset, offset + splitAt),
        line2: text.slice(offset + splitAt, offset + charWidth),
        combined: text.slice(offset, offset + charWidth),
        title: titles[titleIds[idx]],
        author: authors[authorIds[idx]],
        dynasty: '唐',
        _score: score
    };
}

// === Random ===
function handleRandom(msg) {
    const poemType = msg.poemType;
    let record;

    if (poemType === 'five' || (poemType === 'all' && Math.random() < fiveCount / (fiveCount + sevenCount))) {
        const idx = Math.floor(Math.random() * fiveCount);
        record = materialize(fiveText, 10, idx, fiveAuthorIds, fiveTitleIds, '五言', 0);
    } else {
        const idx = Math.floor(Math.random() * sevenCount);
        record = materialize(sevenText, 14, idx, sevenAuthorIds, sevenTitleIds, '七言', 0);
    }
    delete record._score;

    self.postMessage({
        type: 'random-result',
        id: msg.id,
        record
    });
}

// === Stats ===
function handleStats(msg) {
    self.postMessage({
        type: 'stats-result',
        id: msg.id,
        stats: {
            total: fiveCount + sevenCount,
            five: fiveCount,
            seven: sevenCount,
            uniqueChars: fiveIndex.size
        }
    });
}
