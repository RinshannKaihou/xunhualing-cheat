// 完整测试搜索功能
const fs = require('fs');

// 使用全局作用域eval
global.eval(fs.readFileSync('js/data.js', 'utf8'));

// 修改search.js使其导出类
let searchCode = fs.readFileSync('js/search.js', 'utf8');
searchCode = searchCode.replace(
    /\/\/ 导出为全局变量\nconst poemSearcher = new PoemSearcher\(\);/,
    ''
);
global.eval(searchCode);

const searcher = new PoemSearcher();
searcher.init(POEM_RECORDS, INVERTED_INDEX);

console.log('=== 搜索功能测试 ===\n');

// 测试1: 五言通配符
console.log('测试1: pattern="??????????" (五言)');
const r1 = searcher.search({ pattern: '??????????', type: 'five' });
console.log(`  结果: ${r1.count} 条`);
if (r1.count > 0) console.log(`  示例: ${r1.results[0].line1}，${r1.results[0].line2}`);

// 测试2: 七言通配符
console.log('\n测试2: pattern="??????????????" (七言)');
const r2 = searcher.search({ pattern: '??????????????', type: 'seven' });
console.log(`  结果: ${r2.count} 条`);
if (r2.count > 0) console.log(`  示例: ${r2.results[0].line1}，${r2.results[0].line2}`);

// 测试3: 首字确定
console.log('\n测试3: pattern="春????????" (首字春)');
const r3 = searcher.search({ pattern: '春????????', type: 'all' });
console.log(`  结果: ${r3.count} 条`);
if (r3.count > 0) console.log(`  示例: ${r3.results[0].line1}，${r3.results[0].line2}`);

// 测试4: 必含字符
console.log('\n测试4: mustContain=["春"]');
const r4 = searcher.search({ mustContain: ['春'], type: 'all' });
console.log(`  结果: ${r4.count} 条`);
if (r4.count > 0) console.log(`  示例: ${r4.results[0].line1}，${r4.results[0].line2}`);

console.log('\n=== 测试完成 ===');
