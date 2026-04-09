/**
 * 寻花令金手指 - 搜索算法模块
 * 实现诗句的模糊匹配和过滤功能
 */

class PoemSearcher {
    constructor() {
        this.records = [];
        this.index = {};
        this.typeLengths = {
            'five': 10,    // 五言两句 = 10字
            'seven': 14,   // 七言两句 = 14字
            'all': 0       // 全部不限
        };
    }

    /**
     * 初始化搜索器
     * @param {Array} records - 诗句记录数组
     * @param {Object} index - 倒排索引
     */
    init(records, index) {
        this.records = records;
        this.index = index || {};
        console.log(`搜索器已初始化，共 ${records.length} 条记录`);
    }

    /**
     * 主搜索函数
     * @param {Object} options - 搜索选项
     * @param {string} options.type - 诗句类型: 'five', 'seven', 'all'
     * @param {string} options.pattern - 位置模式 (支持 ? 通配符)
     * @param {Array} options.mustContain - 必须包含的字符数组
     * @param {Array} options.mustNotContain - 必须不包含的字符数组
     * @returns {Array} 匹配的诗句记录
     */
    search(options) {
        const startTime = performance.now();

        let results = [...this.records];

        // 1. 按类型过滤
        if (options.type && options.type !== 'all') {
            const typeName = options.type === 'five' ? '五言' : '七言';
            results = results.filter(r => r.type === typeName);
        }

        // 2. 使用倒排索引快速筛选（如果有必含字符）
        if (options.mustContain && options.mustContain.length > 0) {
            results = this._filterByMustContain(results, options.mustContain);
        }

        // 3. 使用倒排索引排除（如果有排除字符）
        if (options.mustNotContain && options.mustNotContain.length > 0) {
            results = this._filterByMustNotContain(results, options.mustNotContain);
        }

        // 4. 模式匹配（如果有位置模式）
        if (options.pattern && options.pattern.trim()) {
            results = this._filterByPattern(results, options.pattern);
        }

        // 5. 计算匹配度并排序
        results = this._rankResults(results, options);

        const endTime = performance.now();

        return {
            results: results,
            count: results.length,
            time: (endTime - startTime).toFixed(2)
        };
    }

    /**
     * 按必含字符过滤（使用倒排索引优化）
     * @private
     */
    _filterByMustContain(results, mustContain) {
        // 移除空值
        const chars = mustContain.filter(c => c && c.trim());

        if (chars.length === 0) return results;

        // 如果倒排索引为空，降级为逐条匹配
        const hasIndex = Object.keys(this.index).length > 0;
        if (!hasIndex) {
            return results.filter(r =>
                chars.every(char => r.combined.includes(char))
            );
        }

        // 使用倒排索引获取候选记录
        let candidateIds = null;

        for (const char of chars) {
            const ids = new Set(this.index[char] || []);

            if (candidateIds === null) {
                candidateIds = ids;
            } else {
                // 取交集
                candidateIds = new Set([...candidateIds].filter(x => ids.has(x)));
            }

            // 早期退出：如果交集为空，直接返回空结果
            if (candidateIds.size === 0) {
                return [];
            }
        }

        // 过滤结果
        return results.filter(r => candidateIds.has(r.id));
    }

    /**
     * 按排除字符过滤
     * @private
     */
    _filterByMustNotContain(results, mustNotContain) {
        const chars = mustNotContain.filter(c => c && c.trim());

        if (chars.length === 0) return results;

        // 如果倒排索引为空，降级为逐条匹配
        const hasIndex = Object.keys(this.index).length > 0;
        if (!hasIndex) {
            return results.filter(r =>
                chars.every(char => !r.combined.includes(char))
            );
        }

        // 使用倒排索引获取需要排除的记录
        const excludeIds = new Set();
        for (const char of chars) {
            const ids = this.index[char] || [];
            ids.forEach(id => excludeIds.add(id));
        }

        // 过滤掉包含排除字符的记录
        return results.filter(r => !excludeIds.has(r.id));
    }

    /**
     * 按位置模式过滤
     * @private
     */
    _filterByPattern(results, pattern) {
        // 构建正则表达式
        // 注意：必须先替换 ?，再转义特殊字符
        const regexPattern = pattern
            .replace(/\?/g, '\x01')           // 先用临时标记替换 ?
            .replace(/[.*+^${}()|[\]\\]/g, '\\$&')  // 转义特殊字符（不含?）
            .replace(/\x01/g, '[^]');         // 将临时标记替换为 [^]

        const regex = new RegExp(`^${regexPattern}$`);

        return results.filter(r => {
            // 对合并后的诗句进行匹配
            return regex.test(r.combined);
        });
    }

    /**
     * 对结果进行排序和评分
     * @private
     */
    _rankResults(results, options) {
        // 如果没有搜索条件，返回原顺序
        if (!options.pattern && !options.mustContain) {
            return results;
        }

        // 计算每个结果的匹配度
        return results.map(record => {
            const score = this._calculateScore(record, options);
            return { ...record, _score: score };
        }).sort((a, b) => b._score - a._score);
    }

    /**
     * 计算单条记录的匹配分数
     * @private
     */
    _calculateScore(record, options) {
        let score = 0;

        // 1. 模式匹配得分（权重最高）
        if (options.pattern) {
            const patternScore = this._calculatePatternScore(record.combined, options.pattern);
            score += patternScore * 10;
        }

        // 2. 必含字符得分
        if (options.mustContain && options.mustContain.length > 0) {
            const containScore = this._calculateContainScore(record.combined, options.mustContain);
            score += containScore * 5;
        }

        return score;
    }

    /**
     * 计算模式匹配分数
     * @private
     */
    _calculatePatternScore(text, pattern) {
        let matches = 0;
        let total = 0;

        for (let i = 0; i < pattern.length && i < text.length; i++) {
            total++;
            if (pattern[i] !== '?' && pattern[i] === text[i]) {
                matches++;
            }
        }

        return total > 0 ? matches / total : 0;
    }

    /**
     * 计算必含字符匹配分数
     * @private
     */
    _calculateContainScore(text, mustContain) {
        const chars = mustContain.filter(c => c && c.trim());
        if (chars.length === 0) return 0;

        let matches = 0;
        for (const char of chars) {
            if (text.includes(char)) {
                matches++;
            }
        }

        return matches / chars.length;
    }

    /**
     * 获取随机诗句
     * @param {string} type - 诗句类型: 'five', 'seven', 'all'
     * @returns {Object} 随机诗句记录
     */
    getRandom(type = 'all') {
        let candidates = this.records;

        if (type !== 'all') {
            const typeName = type === 'five' ? '五言' : '七言';
            candidates = candidates.filter(r => r.type === typeName);
        }

        if (candidates.length === 0) return null;

        const index = Math.floor(Math.random() * candidates.length);
        return candidates[index];
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const five = this.records.filter(r => r.type === '五言').length;
        const seven = this.records.filter(r => r.type === '七言').length;

        return {
            total: this.records.length,
            five: five,
            seven: seven,
            uniqueChars: Object.keys(this.index).length
        };
    }
}

// 导出为全局变量
const poemSearcher = new PoemSearcher();
