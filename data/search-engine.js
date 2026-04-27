/**
 * 寻花令金手指 - 搜索引擎（主线程版）
 * 使用紧凑数据格式 + 倒排索引实现高速搜索
 */

class PoemSearchEngine {
    constructor() {
        this.fiveText = '';
        this.sevenText = '';
        this.fiveAuthorIds = null;
        this.fiveTitleIds = null;
        this.sevenAuthorIds = null;
        this.sevenTitleIds = null;
        this.authors = [];
        this.titles = [];
        this.fiveCount = 0;
        this.sevenCount = 0;
        this.fiveIndex = new Map();
        this.sevenIndex = new Map();
        this.isReady = false;
    }

    /**
     * Whole-batch init (used by tests; production code calls the per-group methods).
     */
    init(dict, five, seven) {
        this.initDict(dict);
        if (five) this.addFiveData(five);
        if (seven) this.addSevenData(seven);
    }

    initDict(dict) {
        this.authors = dict.a;
        this.titles = dict.t;
        this.isReady = true;
    }

    addFiveData(five) {
        this.fiveText = five.t;
        this.fiveCount = five.t.length / 10;
        this.fiveAuthorIds = this._parseCSV(five.a, this.fiveCount);
        this.fiveTitleIds = this._parseCSV(five.i, this.fiveCount);
        this.fiveIndex = this._buildIndex(this.fiveText, 10);
    }

    addSevenData(seven) {
        this.sevenText = seven.t;
        this.sevenCount = seven.t.length / 14;
        this.sevenAuthorIds = this._parseCSV(seven.a, this.sevenCount);
        this.sevenTitleIds = this._parseCSV(seven.i, this.sevenCount);
        this.sevenIndex = this._buildIndex(this.sevenText, 14);
    }

    hasFive() { return this.fiveCount > 0; }
    hasSeven() { return this.sevenCount > 0; }

    _parseCSV(csv, length) {
        const arr = new Uint16Array(length);
        let idx = 0, num = 0;
        for (let i = 0; i < csv.length; i++) {
            const ch = csv.charCodeAt(i);
            if (ch === 44) { // comma
                arr[idx++] = num;
                num = 0;
            } else {
                num = num * 10 + (ch - 48);
            }
        }
        if (idx < length) arr[idx] = num;
        return arr;
    }

    _buildIndex(text, charWidth) {
        const index = new Map();
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            let set = index.get(ch);
            if (!set) {
                set = new Set();
                index.set(ch, set);
            }
            set.add(Math.floor(i / charWidth));
        }
        return index;
    }

    /**
     * 搜索
     */
    search(options) {
        const startTime = performance.now();
        const results = [];
        let totalCount = 0;
        const MAX = 200;

        const searchFive = options.type !== 'seven' && this.hasFive();
        const searchSeven = options.type !== 'five' && this.hasSeven();

        if (searchFive) {
            const r = this._searchGroup(this.fiveText, 10, this.fiveCount, this.fiveIndex, this.fiveAuthorIds, this.fiveTitleIds, '五言', options, MAX);
            totalCount += r.count;
            results.push(...r.results);
        }
        if (searchSeven) {
            const r = this._searchGroup(this.sevenText, 14, this.sevenCount, this.sevenIndex, this.sevenAuthorIds, this.sevenTitleIds, '七言', options, MAX);
            totalCount += r.count;
            results.push(...r.results);
        }

        results.sort((a, b) => b._score - a._score);
        const topResults = results.slice(0, MAX).map(({ _score, ...rest }) => rest);

        return {
            results: topResults,
            count: totalCount,
            time: (performance.now() - startTime).toFixed(2)
        };
    }

    _searchGroup(text, charWidth, count, index, authorIds, titleIds, typeName, params, MAX) {
        const { pattern, mustContain, mustNotContain } = params;
        const hasPattern = pattern && pattern.trim() && pattern.replace(/\?/g, '').length > 0;
        const hasMustContain = mustContain && mustContain.length > 0;
        const hasMustNotContain = mustNotContain && mustNotContain.length > 0;

        // No criteria: return sample
        if (!hasPattern && !hasMustContain && !hasMustNotContain) {
            const results = [];
            const step = Math.max(1, Math.floor(count / MAX));
            for (let i = 0; i < count && results.length < MAX; i += step) {
                results.push(this._materialize(text, charWidth, i, authorIds, titleIds, typeName, 0));
            }
            return { count, results };
        }

        let candidates = null; // null = all

        // Must-contain: intersect via inverted index
        if (hasMustContain) {
            for (const ch of mustContain) {
                if (!ch || !ch.trim()) continue;
                const charSet = index.get(ch);
                if (!charSet || charSet.size === 0) return { count: 0, results: [] };
                if (candidates === null) {
                    candidates = new Set(charSet);
                } else {
                    const next = new Set();
                    for (const idx of candidates) {
                        if (charSet.has(idx)) next.add(idx);
                    }
                    candidates = next;
                }
                if (candidates.size === 0) return { count: 0, results: [] };
            }
        }

        // Must-not-contain: subtract via inverted index
        if (hasMustNotContain) {
            const excludeSet = new Set();
            for (const ch of mustNotContain) {
                if (!ch || !ch.trim()) continue;
                const charSet = index.get(ch);
                if (charSet) for (const idx of charSet) excludeSet.add(idx);
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
            if (pattern.length !== charWidth) return { count: 0, results: [] };
            const regexStr = pattern
                .replace(/\?/g, '\x01')
                .replace(/[.*+^${}()|[\]\\]/g, '\\$&')
                .replace(/\x01/g, '[\\s\\S]');
            regex = new RegExp(`^${regexStr}$`);
        }

        const results = [];
        let totalCount = 0;

        const iterate = (idx) => {
            if (regex) {
                const offset = idx * charWidth;
                if (!regex.test(text.slice(offset, offset + charWidth))) return;
            }
            totalCount++;
            const score = this._calcScore(text, charWidth, idx, params);
            results.push(this._materialize(text, charWidth, idx, authorIds, titleIds, typeName, score));
            if (results.length > MAX * 2) {
                results.sort((a, b) => b._score - a._score);
                results.length = MAX;
            }
        };

        if (candidates !== null) {
            for (const idx of candidates) iterate(idx);
        } else {
            for (let idx = 0; idx < count; idx++) iterate(idx);
        }

        return { count: totalCount, results };
    }

    _calcScore(text, charWidth, idx, params) {
        let score = 0;
        const offset = idx * charWidth;

        if (params.pattern && params.pattern.trim()) {
            let matches = 0, total = 0;
            for (let i = 0; i < params.pattern.length && i < charWidth; i++) {
                total++;
                if (params.pattern[i] !== '?' && params.pattern[i] === text[offset + i]) matches++;
            }
            score += (total > 0 ? matches / total : 0) * 10;
        }

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

    _materialize(text, charWidth, idx, authorIds, titleIds, typeName, score) {
        const offset = idx * charWidth;
        const splitAt = charWidth / 2;
        return {
            id: idx,
            type: typeName,
            line1: text.slice(offset, offset + splitAt),
            line2: text.slice(offset + splitAt, offset + charWidth),
            combined: text.slice(offset, offset + charWidth),
            title: this.titles[titleIds[idx]],
            author: this.authors[authorIds[idx]],
            dynasty: '唐',
            _score: score
        };
    }

    /**
     * 随机诗句
     */
    getRandom(type) {
        const canFive = (type === 'five' || type === 'all') && this.hasFive();
        const canSeven = (type === 'seven' || type === 'all') && this.hasSeven();
        if (!canFive && !canSeven) return null;

        const pickFive = canFive && (!canSeven ||
            Math.random() < this.fiveCount / (this.fiveCount + this.sevenCount));
        if (pickFive) {
            const idx = Math.floor(Math.random() * this.fiveCount);
            return this._materialize(this.fiveText, 10, idx, this.fiveAuthorIds, this.fiveTitleIds, '五言', 0);
        } else {
            const idx = Math.floor(Math.random() * this.sevenCount);
            return this._materialize(this.sevenText, 14, idx, this.sevenAuthorIds, this.sevenTitleIds, '七言', 0);
        }
    }

    /**
     * 统计信息
     */
    getStats() {
        return {
            total: this.fiveCount + this.sevenCount,
            five: this.fiveCount,
            seven: this.sevenCount,
            uniqueChars: this.fiveIndex.size
        };
    }
}

var poemSearchEngine = globalThis.poemSearchEngine = new PoemSearchEngine();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PoemSearchEngine, poemSearchEngine };
}

