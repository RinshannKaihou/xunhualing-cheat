#!/usr/bin/env python3
"""
寻花令金手指 - 处理全唐诗数据
解析全唐诗 txt 文件并生成 JavaScript 数据库
"""

import re
import json
from pathlib import Path
from collections import defaultdict

# 项目路径
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_JS = PROJECT_ROOT / "js" / "data.js"
LOCAL_TXT = SCRIPT_DIR / "temp" / "quantangshi.txt"


def parse_tang_poetry():
    """解析全唐诗 txt 文件"""
    print("正在解析全唐诗...")

    with open(LOCAL_TXT, 'r', encoding='gbk', errors='ignore') as f:
        content = f.read()

    # 解析诗词
    # 格式：卷X_X【标题】作者
    # 诗句内容...
    lines = content.split('\n')

    poems = []
    current_poem = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # 检测标题行
        title_match = re.match(r'卷[\d_]+【(.+?)】(.+)', line)
        if title_match:
            # 保存上一首诗
            if current_poem and current_poem.get('content_lines'):
                content = ''.join(current_poem['content_lines'])
                # 移除标点
                content_clean = re.sub(r'[，。！？、；：""''（）《》]', '', content)
                if content_clean:
                    current_poem['content'] = content_clean
                    poems.append(current_poem)

            # 开始新诗
            current_poem = {
                'title': title_match.group(1).strip(),
                'author': title_match.group(2).strip(),
                'content_lines': []
            }
        elif current_poem:
            # 添加诗句内容
            current_poem['content_lines'].append(line)

    # 保存最后一首
    if current_poem and current_poem.get('content_lines'):
        content = ''.join(current_poem['content_lines'])
        content_clean = re.sub(r'[，。！？、；：""''（）《》]', '', content)
        if content_clean:
            current_poem['content'] = content_clean
            poems.append(current_poem)

    print(f"  解析了 {len(poems)} 首诗")
    return poems


def extract_line_pairs(poems):
    """从诗中提取相邻两句"""
    print("正在提取诗句对...")
    records = []
    id_counter = 1

    for poem in poems:
        title = poem.get("title", "未知")
        author = poem.get("author", "佚名")
        content = poem.get("content", "")

        if not content:
            continue

        # 判断是五言还是七言
        content_len = len(content)

        # 尝试判断
        line_length = None
        if content_len % 5 == 0 and content_len >= 10:
            line_length = 5
        elif content_len % 7 == 0 and content_len >= 14:
            line_length = 7
        else:
            # 尝试其他方法
            if content_len in [10, 20, 30, 40]:
                line_length = 5
            elif content_len in [14, 28, 42, 56]:
                line_length = 7

        if line_length is None:
            continue

        # 提取相邻两句
        num_pairs = content_len // (line_length * 2)
        for i in range(num_pairs):
            start = i * line_length * 2
            line1 = content[start:start + line_length]
            line2 = content[start + line_length:start + line_length * 2]

            # 验证
            if len(line1) == line_length and len(line2) == line_length:
                if re.match(r'^[\u4e00-\u9fa5]+$', line1) and re.match(r'^[\u4e00-\u9fa5]+$', line2):
                    poem_type = "五言" if line_length == 5 else "七言"

                    records.append({
                        "id": id_counter,
                        "type": poem_type,
                        "line1": line1,
                        "line2": line2,
                        "combined": line1 + line2,
                        "title": title,
                        "author": author,
                        "dynasty": "唐"
                    })
                    id_counter += 1

        if id_counter % 5000 == 0:
            print(f"  已处理 {id_counter} 条记录...")

    print(f"  提取了 {len(records)} 条诗句对")
    return records


def build_index(records):
    """构建倒排索引"""
    print("正在构建倒排索引...")
    index = {}

    for record in records:
        for char in record["combined"]:
            if char not in index:
                index[char] = []
            if record["id"] not in index[char]:
                index[char].append(record["id"])

    print(f"  索引包含 {len(index)} 个唯一字符")
    return index


def generate_js(records, index):
    """生成 JavaScript 数据文件"""
    print("正在生成 JavaScript 数据文件...")

    type_counts = defaultdict(int)
    for r in records:
        type_counts[r["type"]] += 1

    js_content = f"""// 寻花令金手指 - 诗句数据库
// 全唐诗数据 (40442首诗) - 自动生成

// 数据统计
const DATABASE_STATS = {{
    totalRecords: {len(records)},
    fiveChar: {type_counts.get("五言", 0)},
    sevenChar: {type_counts.get("七言", 0)}
}};

// 诗句数据
const POEM_RECORDS = {json.dumps(records, ensure_ascii=False)};

// 倒排索引 (字符 -> 记录ID列表)
const INVERTED_INDEX = {json.dumps(index, ensure_ascii=False)};

console.log('全唐诗数据库已加载，共', POEM_RECORDS.length, '条记录');
"""

    OUTPUT_JS.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"  数据文件已生成: {OUTPUT_JS}")
    print(f"  总记录数: {len(records)}")
    print(f"  五言: {type_counts.get('五言', 0)} 条")
    print(f"  七言: {type_counts.get('七言', 0)} 条")
    print(f"  文件大小: {OUTPUT_JS.stat().st_size / 1024:.1f} KB")


def main():
    print("=" * 50)
    print("寻花令金手指 - 全唐诗数据处理")
    print("=" * 50)

    # 解析诗词
    poems = parse_tang_poetry()

    if not poems:
        print("没有解析到诗词，退出")
        return

    # 提取诗句对
    records = extract_line_pairs(poems)

    if not records:
        print("没有提取到诗句对，退出")
        return

    # 构建索引
    index = build_index(records)

    # 生成 JS 文件
    generate_js(records, index)

    print("\n" + "=" * 50)
    print("处理完成！")
    print("=" * 50)


if __name__ == "__main__":
    main()
