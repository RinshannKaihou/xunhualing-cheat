/**
 * 寻花令金手指 - 应用主逻辑
 * 处理用户交互、UI更新和搜索集成
 */

class XunhualingApp {
    constructor() {
        this.searcher = poemSearchEngine;
        this.debounceTimer = null;
        this.isInitialized = false;

        // DOM 元素引用
        this.elements = {
            patternInput: document.getElementById('patternInput'),
            patternInputHidden: document.getElementById('patternInputHidden'),
            hiddenImeInput: document.getElementById('hiddenImeInput'),
            mustContainInput: document.getElementById('mustContainInput'),
            mustNotContainInput: document.getElementById('mustNotContainInput'),
            searchBtn: document.getElementById('searchBtn'),
            clearBtn: document.getElementById('clearBtn'),
            randomBtn: document.getElementById('randomBtn'),
            resultsCount: document.getElementById('resultsCount'),
            resultsContainer: document.getElementById('resultsContainer'),
            searchTime: document.getElementById('searchTime'),
            dbStats: document.getElementById('dbStats'),
            toast: document.getElementById('toast'),
            typeRadios: document.getElementsByName('poemType'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            progressFill: document.getElementById('progressFill'),
            loadingStatus: document.getElementById('loadingStatus')
        };

        // 当前聚焦的方块索引
        this.focusedBoxIndex = -1;

        // 方块配置
        this.boxConfigs = {
            'five': { count: 10, splitAt: 5, className: 'five-char' },
            'seven': { count: 14, splitAt: 7, className: 'seven-char' },
            'all': { count: 10, splitAt: 5, className: 'five-char' }
        };

        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        // 绑定事件
        this.bindEvents();

        // 初始化搜索引擎（数据已通过 <script> 标签加载）
        this.elements.loadingStatus.textContent = '正在构建搜索索引...';
        this.elements.progressFill.style.width = '50%';

        // 用 setTimeout 让浏览器先渲染加载界面
        setTimeout(() => {
            this.searcher.init(POEM_DICT, POEM_FIVE, POEM_SEVEN);
            this.isInitialized = true;

            // 隐藏加载覆盖层
            this.elements.loadingOverlay.classList.add('hidden');

            // 更新UI
            this.updateDBStats();
            this.initPatternBoxes();

            // 恢复之前的搜索状态
            const savedParams = this.loadSearchParams();
            if (savedParams && savedParams.hasData) {
                this.restoreSearch(savedParams);
            }

            console.log('应用初始化完成');
        }, 10);
    }

    /**
     * 初始化方块输入
     */
    initPatternBoxes() {
        this.renderPatternBoxes('all');
        this.bindGlobalBoxEvents();
    }

    /**
     * 绑定全局方块事件（只绑定一次）
     */
    bindGlobalBoxEvents() {
        const container = this.elements.patternInput;
        const hiddenInput = this.elements.hiddenImeInput;
        let isComposing = false;

        // 点击方块聚焦
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('pattern-box')) {
                const index = parseInt(e.target.dataset.index);
                this.focusBoxByIndex(index);
            }
        });

        // 监听隐藏输入框的输入事件
        hiddenInput.addEventListener('input', (e) => {
            if (isComposing) return;
            const value = e.target.value;
            if (value.length > 0) {
                const char = value.slice(-1);
                this.setFocusedBoxChar(char);
                e.target.value = '';
                this.focusNextBox(this.focusedBoxIndex);
            }
        });

        // IME输入开始
        hiddenInput.addEventListener('compositionstart', () => {
            isComposing = true;
        });

        // IME输入结束
        hiddenInput.addEventListener('compositionend', (e) => {
            isComposing = false;
            const value = e.data;
            if (value && value.length > 0) {
                this.setFocusedBoxChar(value[0]);
                e.target.value = '';
                this.focusNextBox(this.focusedBoxIndex);
            }
        });

        // 键盘事件
        hiddenInput.addEventListener('keydown', (e) => {
            if (this.focusedBoxIndex < 0) return;
            const index = this.focusedBoxIndex;
            if (e.key === 'Backspace' || e.key === 'Delete' || e.key === ' ') {
                this.setFocusedBoxChar('');
                e.preventDefault();
            } else if (e.key === 'ArrowLeft') {
                this.focusBoxByIndex(index - 1);
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                this.focusBoxByIndex(index + 1);
                e.preventDefault();
            }
        });
    }

    /**
     * 渲染方块输入
     */
    renderPatternBoxes(type) {
        const config = this.boxConfigs[type] || this.boxConfigs['all'];
        const container = this.elements.patternInput;
        container.innerHTML = '';
        container.className = `pattern-boxes ${config.className}`;
        this.focusedBoxIndex = -1;

        for (let i = 0; i < config.count; i++) {
            const box = document.createElement('div');
            box.className = 'pattern-box empty';
            box.dataset.index = i;
            box.textContent = '□';

            if (i === config.splitAt) {
                const separator = document.createElement('span');
                separator.className = 'pattern-separator';
                separator.textContent = '，';
                container.appendChild(separator);
            }
            container.appendChild(box);
        }
    }

    setFocusedBoxChar(char) {
        const boxes = this.elements.patternInput.querySelectorAll('.pattern-box');
        if (this.focusedBoxIndex >= 0 && this.focusedBoxIndex < boxes.length) {
            const box = boxes[this.focusedBoxIndex];
            if (char) {
                box.textContent = char;
                box.classList.remove('empty');
            } else {
                box.textContent = '□';
                box.classList.add('empty');
            }
            this.updatePatternFromBoxes();
        }
    }

    focusBox(box) {
        const boxes = this.elements.patternInput.querySelectorAll('.pattern-box');
        const index = Array.from(boxes).indexOf(box);
        if (index >= 0) this.focusBoxByIndex(index);
    }

    focusBoxByIndex(index) {
        const boxes = this.elements.patternInput.querySelectorAll('.pattern-box');
        boxes.forEach(b => b.classList.remove('focused'));
        if (index >= 0 && index < boxes.length) {
            boxes[index].classList.add('focused');
            this.focusedBoxIndex = index;
        } else {
            this.focusedBoxIndex = -1;
        }
        this.elements.hiddenImeInput.focus();
    }

    focusNextBox(currentIndex) {
        const boxes = this.elements.patternInput.querySelectorAll('.pattern-box');
        for (let i = currentIndex + 1; i < boxes.length; i++) {
            this.focusBoxByIndex(i);
            return;
        }
    }

    updatePatternFromBoxes() {
        const boxes = this.elements.patternInput.querySelectorAll('.pattern-box');
        let pattern = '';
        boxes.forEach(box => {
            pattern += box.textContent === '□' ? '?' : box.textContent;
        });
        this.elements.patternInputHidden.value = pattern;
        this.elements.patternInput.dataset.pattern = pattern;
        this.debounceSearch();
    }

    updateBoxesFromPattern(pattern) {
        const boxes = this.elements.patternInput.querySelectorAll('.pattern-box');
        boxes.forEach((box, i) => {
            if (pattern && i < pattern.length) {
                const char = pattern[i];
                if (char === '?') {
                    box.textContent = '□';
                    box.classList.add('empty');
                } else {
                    box.textContent = char;
                    box.classList.remove('empty');
                }
            } else {
                box.textContent = '□';
                box.classList.add('empty');
            }
        });
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        this.elements.searchBtn.addEventListener('click', () => this.performSearch());
        this.elements.clearBtn.addEventListener('click', () => this.clearForm());
        this.elements.randomBtn.addEventListener('click', () => this.showRandom());

        const inputs = [this.elements.mustContainInput, this.elements.mustNotContainInput];
        inputs.forEach(input => {
            input.addEventListener('input', () => this.debounceSearch());
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        });

        document.querySelectorAll('.example-tag').forEach(tag => {
            tag.addEventListener('click', () => this.handleExampleAction(tag.dataset.action));
        });

        this.elements.typeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.renderPatternBoxes(radio.value);
                this.updatePatternFromBoxes();
                if (this.elements.mustContainInput.value || this.elements.mustNotContainInput.value) {
                    this.performSearch();
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.pattern-boxes') && !e.target.closest('.hidden-ime-input')) {
                this.elements.patternInput.querySelectorAll('.pattern-box').forEach(b => b.classList.remove('focused'));
                this.focusedBoxIndex = -1;
            }
        });

        this.elements.resultsContainer.addEventListener('click', (e) => {
            if (e.target.closest('.copy-btn')) this.copyToClipboard(e.target.closest('.result-card'));
        });
    }

    handleExampleAction(action) {
        switch (action) {
            case 'clear': this.clearPatternBoxes(); break;
            case 'fillRandom': this.fillRandomPattern(); break;
            case 'example1': this.setPattern('春???????'); break;
            case 'example2': this.setPattern('???明月'); break;
        }
        this.updatePatternFromBoxes();
        this.performSearch();
    }

    clearPatternBoxes() {
        this.elements.patternInput.querySelectorAll('.pattern-box').forEach(box => {
            box.textContent = '□';
            box.classList.add('empty');
        });
    }

    fillRandomPattern() {
        const boxes = this.elements.patternInput.querySelectorAll('.pattern-box');
        const commonChars = '春夏秋冬风雨山水花月云星天地';
        boxes.forEach(box => {
            if (Math.random() > 0.7) {
                box.textContent = commonChars[Math.floor(Math.random() * commonChars.length)];
                box.classList.remove('empty');
            }
        });
    }

    setPattern(pattern) {
        this.updateBoxesFromPattern(pattern);
    }

    debounceSearch() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.performSearch(), 300);
    }

    /**
     * 执行搜索
     */
    performSearch() {
        if (!this.isInitialized) return;
        const params = this.getSearchParams();
        this.saveSearchParams(params);
        this.showSearching();

        // 用 setTimeout 让 UI 显示"搜索中"状态
        setTimeout(() => {
            const result = this.searcher.search(params);
            this.displayResults(result);
        }, 10);
    }

    getSearchParams() {
        let type = 'all';
        for (const radio of this.elements.typeRadios) {
            if (radio.checked) { type = radio.value; break; }
        }
        const pattern = this.elements.patternInputHidden.value.trim();
        const splitChars = (text) => text ? text.split(/[\s,，、]+/).filter(c => c.length > 0) : [];
        return {
            type,
            pattern,
            mustContain: splitChars(this.elements.mustContainInput.value.trim()),
            mustNotContain: splitChars(this.elements.mustNotContainInput.value.trim())
        };
    }

    showSearching() {
        this.elements.resultsCount.textContent = '搜索中...';
        this.elements.searchTime.textContent = '';
        this.elements.resultsContainer.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>正在搜索诗句...</p>
            </div>
        `;
    }

    displayResults(searchResult) {
        const { results, count, time } = searchResult;
        if (count === 0) {
            this.elements.resultsCount.textContent = '未找到匹配结果';
            this.elements.resultsCount.classList.add('no-results');
        } else {
            this.elements.resultsCount.textContent = `找到 ${count} 条匹配结果`;
            this.elements.resultsCount.classList.remove('no-results');
        }
        this.elements.searchTime.textContent = time ? `(${time} ms)` : '';
        if (count === 0) {
            this.showNoResults();
        } else {
            this.renderResults(results);
        }
    }

    showNoResults() {
        this.elements.resultsContainer.innerHTML = `
            <div class="no-results-state">
                <div class="empty-icon">🔍</div>
                <p>未找到匹配的诗句</p>
                <p class="empty-hint">尝试减少搜索条件或使用方块输入</p>
            </div>
        `;
    }

    renderResults(results) {
        this.elements.resultsContainer.innerHTML = results.map(r => this.renderResultCard(r)).join('');
    }

    renderResultCard(record) {
        const params = this.getSearchParams();
        const highlightClass = record.type === '五言' ? 'five-char' : 'seven-char';
        const line1Highlight = this.getLineHighlight(record.line1, 0, params);
        const line2Highlight = this.getLineHighlight(record.line2, record.line1.length, params);

        return `
            <div class="result-card" data-id="${record.id}">
                <div class="result-content ${highlightClass}">
                    <div class="result-lines">
                        <span class="result-line">${this.applyHighlight(record.line1, line1Highlight)}</span>
                        <span class="result-punctuation">，</span>
                        <span class="result-line">${this.applyHighlight(record.line2, line2Highlight)}</span>
                    </div>
                    <div class="result-info">
                        <span class="result-title">《${record.title}》</span>
                        <span class="result-author">${record.author}</span>
                        <span class="result-dynasty">[${record.dynasty}]</span>
                    </div>
                </div>
                <div class="result-actions">
                    <button class="action-btn copy-btn" title="复制"><span>📋</span></button>
                </div>
            </div>
        `;
    }

    getLineHighlight(line, offset, params) {
        const highlights = new Set();
        if (params.pattern) {
            for (let i = 0; i < line.length; i++) {
                const pi = offset + i;
                if (pi < params.pattern.length && params.pattern[pi] !== '?') highlights.add(i);
            }
        }
        if (params.mustContain && params.mustContain.length > 0) {
            for (const char of params.mustContain) {
                for (let i = 0; i < line.length; i++) {
                    if (line[i] === char) highlights.add(i);
                }
            }
        }
        return highlights;
    }

    applyHighlight(text, highlights) {
        if (highlights.size === 0) return text;
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += highlights.has(i) ? `<mark>${text[i]}</mark>` : text[i];
        }
        return result;
    }

    copyToClipboard(card) {
        const text = card.querySelector('.result-lines').textContent.replace('，', '');
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('已复制到剪贴板');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('已复制到剪贴板');
        });
    }

    showToast(message) {
        this.elements.toast.textContent = message;
        this.elements.toast.classList.add('show');
        setTimeout(() => this.elements.toast.classList.remove('show'), 2000);
    }

    clearForm() {
        this.clearPatternBoxes();
        this.updatePatternFromBoxes();
        this.elements.mustContainInput.value = '';
        this.elements.mustNotContainInput.value = '';
        for (const radio of this.elements.typeRadios) {
            if (radio.value === 'all') { radio.checked = true; break; }
        }
        this.renderPatternBoxes('all');
        this.updatePatternFromBoxes();
        this.elements.resultsCount.textContent = '准备搜索';
        this.elements.resultsCount.classList.remove('no-results');
        this.elements.searchTime.textContent = '';
        this.elements.resultsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📜</div>
                <p>输入搜索条件开始查找诗句</p>
                <p class="empty-hint">可以使用确定位置模式、必含文字或两者组合</p>
            </div>
        `;
        localStorage.removeItem('xunhualingSearchParams');
    }

    showRandom() {
        if (!this.isInitialized) return;
        let type = 'all';
        for (const radio of this.elements.typeRadios) {
            if (radio.checked) { type = radio.value; break; }
        }
        const record = this.searcher.getRandom(type);
        if (record) {
            this.displayResults({ results: [record], count: 1, time: '0.00' });
        }
    }

    updateDBStats() {
        const stats = this.searcher.getStats();
        this.elements.dbStats.innerHTML = `
            <strong>${stats.total}</strong> 条
            (五言 ${stats.five} 条，七言 ${stats.seven} 条)
        `;
    }

    saveSearchParams(params) {
        const hasData = params.pattern || params.mustContain.length > 0 || params.mustNotContain.length > 0;
        localStorage.setItem('xunhualingSearchParams', JSON.stringify({ ...params, hasData }));
    }

    loadSearchParams() {
        const saved = localStorage.getItem('xunhualingSearchParams');
        if (saved) { try { return JSON.parse(saved); } catch { return null; } }
        return null;
    }

    restoreSearch(params) {
        for (const radio of this.elements.typeRadios) {
            if (radio.value === params.type) { radio.checked = true; break; }
        }
        this.renderPatternBoxes(params.type);
        if (params.pattern) {
            this.updateBoxesFromPattern(params.pattern);
            this.updatePatternFromBoxes();
        }
        this.elements.mustContainInput.value = (params.mustContain || []).join(' ');
        this.elements.mustNotContainInput.value = (params.mustNotContain || []).join(' ');
        this.performSearch();
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new XunhualingApp();
});
