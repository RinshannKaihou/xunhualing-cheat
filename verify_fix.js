// 验证修复
function buildRegex(pattern) {
    const regexPattern = pattern
        .replace(/\?/g, '\x01')
        .replace(/[.*+^${}()|[\]\\]/g, '\\$&')
        .replace(/\x01/g, '[^]');
    return new RegExp(`^${regexPattern}$`);
}

console.log('=== 验证修复后的搜索逻辑 ===\n');

const regex = buildRegex('??????????');
console.log('正则:', regex);
console.log('匹配10个字符:', regex.test('秦川雄帝宅函谷壮皇居'));
console.log('匹配14个字符:', regex.test('春眠不觉晓处处闻啼鸟'));

const regex2 = buildRegex('春????????');
console.log('\n正则:', regex2);
console.log('匹配"春眠不觉晓处处闻啼鸟":', regex2.test('春眠不觉晓处处闻啼鸟'));

const regex3 = buildRegex('明月??');
console.log('\n正则:', regex3);
console.log('匹配"明月几时有":', regex3.test('明月几时有'));
