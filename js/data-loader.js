/**
 * 寻花令金手指 - 数据加载器
 * 负责数据获取、IndexedDB缓存和Web Worker通信
 */

class DataLoader {
    constructor() {
        this.worker = null;
        this._nextId = 1;
        this._pending = new Map(); // id -> {resolve, reject}
        this.onProgress = null;    // callback(stage, percent)
        this.stats = null;
        this._latestSearchId = 0;

        // Data version — bump this to invalidate cache
        this.DATA_VERSION = 1;
        this.DB_NAME = 'xunhualing-db';
        this.STORE_NAME = 'data-cache';
        this.CACHE_KEY = `v${this.DATA_VERSION}`;
    }

    /**
     * Load data and initialize the search worker.
     * Shows progress via onProgress callback.
     */
    async load() {
        // Create worker
        this.worker = new Worker('js/search-worker.js');
        this.worker.onmessage = (e) => this._handleWorkerMessage(e);

        // Try loading from IndexedDB cache first
        this._reportProgress('检查本地缓存', 5);
        const cached = await this._loadFromCache();

        let dict, five, seven;
        if (cached) {
            this._reportProgress('从缓存加载数据', 10);
            dict = cached.dict;
            five = cached.five;
            seven = cached.seven;
        } else {
            // Fetch from network
            this._reportProgress('下载诗句数据', 10);
            const [dictResp, fiveResp, sevenResp] = await Promise.all([
                fetch('data/dict.json'),
                fetch('data/poems_five.json'),
                fetch('data/poems_seven.json')
            ]);

            this._reportProgress('解析数据', 40);
            [dict, five, seven] = await Promise.all([
                dictResp.json(),
                fiveResp.json(),
                sevenResp.json()
            ]);

            // Cache in IndexedDB (fire and forget)
            this._saveToCache(dict, five, seven).catch(() => {});
        }

        // Send data to worker for initialization
        this._reportProgress('初始化搜索引擎', 50);

        return new Promise((resolve, reject) => {
            this._initResolve = resolve;
            this._initReject = reject;
            this.worker.postMessage({ type: 'init', dict, five, seven });
        });
    }

    /**
     * Search poems with given parameters.
     * Returns Promise<{results, count, time}>
     */
    search(params) {
        const id = this._nextId++;
        this._latestSearchId = id;
        return new Promise((resolve) => {
            this._pending.set(id, resolve);
            this.worker.postMessage({ type: 'search', id, params });
        });
    }

    /**
     * Get a random poem.
     * Returns Promise<record>
     */
    getRandom(poemType) {
        const id = this._nextId++;
        return new Promise((resolve) => {
            this._pending.set(id, resolve);
            this.worker.postMessage({ type: 'random', id, poemType });
        });
    }

    /**
     * Get database statistics.
     * Returns Promise<{total, five, seven}>
     */
    getStats() {
        if (this.stats) return Promise.resolve(this.stats);
        const id = this._nextId++;
        return new Promise((resolve) => {
            this._pending.set(id, resolve);
            this.worker.postMessage({ type: 'stats', id });
        });
    }

    /**
     * Check if a search result is still the latest one.
     */
    isLatestSearch(id) {
        return id === this._latestSearchId;
    }

    // === Private: Worker message handler ===

    _handleWorkerMessage(e) {
        const msg = e.data;
        switch (msg.type) {
            case 'init-progress':
                this._reportProgress(msg.stage, 50 + msg.percent * 0.5);
                break;

            case 'init-done':
                this.stats = msg.stats;
                this._reportProgress('准备就绪', 100);
                if (this._initResolve) {
                    this._initResolve(msg.stats);
                    this._initResolve = null;
                }
                break;

            case 'search-result': {
                const resolve = this._pending.get(msg.id);
                if (resolve) {
                    this._pending.delete(msg.id);
                    resolve({
                        id: msg.id,
                        results: msg.results,
                        count: msg.count,
                        time: msg.time
                    });
                }
                break;
            }

            case 'random-result': {
                const resolve = this._pending.get(msg.id);
                if (resolve) {
                    this._pending.delete(msg.id);
                    resolve(msg.record);
                }
                break;
            }

            case 'stats-result': {
                const resolve = this._pending.get(msg.id);
                if (resolve) {
                    this._pending.delete(msg.id);
                    this.stats = msg.stats;
                    resolve(msg.stats);
                }
                break;
            }
        }
    }

    _reportProgress(stage, percent) {
        if (this.onProgress) {
            this.onProgress(stage, percent);
        }
    }

    // === Private: IndexedDB cache ===

    _openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async _loadFromCache() {
        try {
            const db = await this._openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(this.STORE_NAME, 'readonly');
                const store = tx.objectStore(this.STORE_NAME);
                const request = store.get(this.CACHE_KEY);
                request.onsuccess = () => {
                    db.close();
                    const data = request.result;
                    if (data && data.version === this.DATA_VERSION) {
                        resolve(data);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => {
                    db.close();
                    resolve(null);
                };
            });
        } catch {
            return null;
        }
    }

    async _saveToCache(dict, five, seven) {
        try {
            const db = await this._openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORE_NAME, 'readwrite');
                const store = tx.objectStore(this.STORE_NAME);
                store.put({
                    version: this.DATA_VERSION,
                    dict,
                    five,
                    seven,
                    timestamp: Date.now()
                }, this.CACHE_KEY);
                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };
                tx.onerror = () => {
                    db.close();
                    reject(tx.error);
                };
            });
        } catch {
            // Ignore cache write failures
        }
    }
}
