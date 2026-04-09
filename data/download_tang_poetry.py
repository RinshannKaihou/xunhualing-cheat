#!/usr/bin/env python3
"""
寻花令金手指 - 下载全唐诗数据
从 GitHub 下载全唐诗 txt 文件并处理成可用格式
"""

import re
import json
import time
from pathlib import Path
from urllib.request import urlretrieve
from collections import defaultdict

# 项目路径
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent if (SCRIPT_DIR.name != "data") else SCRIPT_DIR
OUTPUT_JS = PROJECT_ROOT / "js" / "data.js"

# 全唐诗下载地址
TANG_POETRY_URL = "https://raw.githubusercontent.com/sdw95927/Tang_Poetry_generator_by_LSTM/master/%E5%85%A8%E5%94%90%E8%AF%97.txt"
LOCAL_TXT = SCRIPT_DIR / "temp" / "quantangshi.txt"


def download_tang_poetry():
    """下载全唐诗"""
    print("正在下载全唐诗...")
    SCRIPT_DIR.mkdir(exist_ok=True)
    try:
        # 下载文件
        print(f"  从 {TANG_POETRY_URL} 下载...")
        urlretrieve(TANG_POETRY_URL, LOCAL_TXT)
        print(f"  下载完成: {LOCAL_TXT.stat().st_size / 1024 / 1024:.1f} MB")
        return True
    except Exception as e:
        print(f"  下载失败: {e}")
        return False


def parse_tang_poetry_txt():
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

        # 检测标题行（卷号格式）
        title_match = re.match(r'卷[\d_]+【(.+?)】(.+)', line)
        if title_match:
            # 保存上一首诗
            if current_poem and current_poem.get('content_lines'):
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

    # 保存最后一首诗
    if current_poem and current_poem.get('content_lines'):
        poems.append(current_poem)

    print(f"  解析了 {len(poems)} 首诗")
    return poems


def extract_line_pairs_from_poems(poems):
    """从诗中提取相邻两句，智能识别诗句边界"""
    print("正在提取诗句对...")
    records = []
    id_counter = 1

    for poem in poems:
        title = poem.get("title", "未知")
        author = poem.get("author", "佚名")
        content_lines = poem.get("content_lines", [])

        if not content_lines:
            continue

        # 合并所有内容行，保留句号作为分隔符
        content = ''.join(content_lines)

        # 按句号分割成独立的诗部分
        poem_parts = re.split(r'。', content)

        for part in poem_parts:
            part = part.strip()
            if not part:
                continue

            # 移除标点符号
            part_clean = re.sub(r'[，！？、；：""''（）《》\s]', '', part)

            if not part_clean:
                continue

            # 根据长度智能识别诗句类型
            lines = []
            if len(part_clean) >= 10 and len(part_clean) % 5 == 0:
                # 五言诗句对
                i = 0
                while i + 10 <= len(part_clean):
                    test_line1 = part_clean[i:i+5]
                    test_line2 = part_clean[i+5:i+10]
                    if re.match(r'^[\u4e00-\u9fa5]+$', test_line1) and re.match(r'^[\u4e00-\u9fa5]+$', test_line2):
                        lines.append((test_line1, test_line2))
                        i += 10
                    else:
                        i += 1
            elif len(part_clean) >= 14 and len(part_clean) % 7 == 0:
                # 七言诗句对
                i = 0
                while i + 14 <= len(part_clean):
                    test_line1 = part_clean[i:i+7]
                    test_line2 = part_clean[i+7:i+14]
                    if re.match(r'^[\u4e00-\u9fa5]+$', test_line1) and re.match(r'^[\u4e00-\u9fa5]+$', test_line2):
                        lines.append((test_line1, test_line2))
                        i += 14
                    else:
                        i += 1

            # 为该首诗的所有诗句对创建记录
            for line1, line2 in lines:
                # 验证
                if len(line1) == 5 and len(line2) == 5:
                    poem_type = "五言"
                elif len(line1) == 7 and len(line2) == 7:
                    poem_type = "七言"
                else:
                    continue

                if re.match(r'^[\u4e00-\u9fa5]+$', line1) and re.match(r'^[\u4e00-\u9fa5]+$', line2):
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
// 全唐诗数据 ({len(records)}首诗) - 自动生成

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

    # 下载数据
    if not LOCAL_TXT.exists():
        if not download_tang_poetry():
            print("下载失败，退出")
            return
    else:
        print(f"使用已下载的文件: {LOCAL_TXT}")

    # 解析诗词
    poems = parse_tang_poetry_txt()

    if not poems:
        print("没有解析到诗词，退出")
        return

    # 提取诗句对
    records = extract_line_pairs_from_poems(poems)

    if not records:
        print("没有提取到诗句对，退出")
        return

    # 构建索引
    index = build_index(records)

    # 生成 JS 文件
    generate_js(records, index)

    # 清理临时文件
    if LOCAL_TXT.exists():
        LOCAL_TXT.unlink()
        print("\n临时文件已清理")

    print("\n" + "=" * 50)
    print("处理完成！")
    print("=" * 50)


if __name__ == "__main__":
    main()
