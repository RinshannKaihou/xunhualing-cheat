#!/usr/bin/env python3
"""
寻花令金手指 - 数据预处理脚本
从 chinese-poetry 仓库下载并处理唐诗数据，生成适合查询的格式
"""

import json
import os
import re
from urllib.request import urlretrieve
from pathlib import Path
from collections import defaultdict

# 配置
BASE_URL = "https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/master/json/poet"
# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_DIR = SCRIPT_DIR / "raw"
OUTPUT_JS = PROJECT_ROOT / "js" / "data.js"
TEMP_DIR = SCRIPT_DIR / "temp"

# 诗句类型对应的字数
TYPE_LENGTHS = {
    "五言": 5,
    "七言": 7
}


def download_poetry_data():
    """下载唐诗数据"""
    print("正在下载唐诗数据...")

    TEMP_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(exist_ok=True)

    # 下载唐诗数据 (约 5.5万首)
    # chinese-poetry 仓库将数据按诗人编号分块
    # 这里我们下载主要的唐诗文件
    tang_files = [
        "tang.500.json", "tang.1000.json", "tang.1500.json", "tang.2000.json",
        "tang.2500.json", "tang.3000.json", "tang.3500.json", "tang.4000.json",
        "tang.4500.json", "tang.5000.json", "tang.5500.json", "tang.5800.json"
    ]

    all_poems = []

    for filename in tang_files:
        url = f"{BASE_URL}/{filename}"
        local_path = TEMP_DIR / filename

        try:
            if not local_path.exists():
                print(f"下载: {filename}")
                urlretrieve(url, local_path)

            with open(local_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                all_poems.extend(data)
                print(f"  已加载 {len(data)} 首诗")
        except Exception as e:
            print(f"下载 {filename} 失败: {e}")
            continue

    print(f"总共下载了 {len(all_poems)} 首诗")
    return all_poems


def is_poem_line_length(line, expected_length):
    """检查诗句是否符合指定的字数"""
    # 移除标点符号
    clean_line = re.sub(r'[，。！？、；：""''（）《》]', '', line)
    return len(clean_line) == expected_length


def extract_line_pairs(poems):
    """
    从诗中提取相邻的两句作为一组
    返回格式: {type, line1, line2, combined, title, author, dynasty}
    """
    print("正在提取诗句对...")
    records = []
    id_counter = 1

    for poem in poems:
        # 获取基本信息
        title = poem.get("title", "未知")
        author = poem.get("author", "佚名")
        dynasty = "唐"  # 默认为唐代

        # 获取诗句内容
        paragraphs = poem.get("paragraphs", [])

        # 合并所有段落
        all_lines = []
        for para in paragraphs:
            lines = para.split('\n')
            all_lines.extend([line.strip() for line in lines if line.strip()])

        # 检测诗句类型（五言或七言）
        poem_type = None
        if all_lines:
            first_line_clean = re.sub(r'[，。！？、；：""''（）《》]', '', all_lines[0])
            if len(first_line_clean) == 5:
                poem_type = "五言"
            elif len(first_line_clean) == 7:
                poem_type = "七言"

        if not poem_type:
            continue

        # 提取相邻两句
        expected_length = TYPE_LENGTHS[poem_type]

        for i in range(0, len(all_lines) - 1):
            line1 = all_lines[i]
            line2 = all_lines[i + 1]

            # 检查两句是否符合长度要求
            if (is_poem_line_length(line1, expected_length) and
                is_poem_line_length(line2, expected_length)):

                # 移除标点
                line1_clean = re.sub(r'[，。！？、；：""''（）《》]', '', line1)
                line2_clean = re.sub(r'[，。！？、；：""''（）《》]', '', line2)

                # 跳过空句
                if not line1_clean or not line2_clean:
                    continue

                records.append({
                    "id": id_counter,
                    "type": poem_type,
                    "line1": line1_clean,
                    "line2": line2_clean,
                    "combined": line1_clean + line2_clean,
                    "title": title,
                    "author": author,
                    "dynasty": dynasty
                })
                id_counter += 1

    print(f"提取了 {len(records)} 条诗句对")
    return records


def build_inverted_index(records):
    """
    构建倒排索引
    返回: {character: [record_ids]}
    """
    print("正在构建倒排索引...")
    index = defaultdict(set)

    for record in records:
        # 为每个字符建立索引
        for char in record["combined"]:
            index[char].add(record["id"])

    # 转换为列表以便 JSON 序列化
    index_dict = {k: list(v) for k, v in index.items()}
    print(f"索引包含 {len(index_dict)} 个唯一字符")

    return index_dict


def generate_js_file(records, index):
    """生成 JavaScript 数据文件"""
    print("正在生成 JavaScript 数据文件...")

    # 统计信息
    type_counts = defaultdict(int)
    for record in records:
        type_counts[record["type"]] += 1

    js_content = f"""// 寻花令金手指 - 诗句数据库
// 自动生成，请勿手动编辑

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
"""

    OUTPUT_JS.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"数据文件已生成: {OUTPUT_JS}")
    print(f"  总记录数: {len(records)}")
    print(f"  五言: {type_counts.get('五言', 0)} 条")
    print(f"  七言: {type_counts.get('七言', 0)} 条")
    print(f"  文件大小: {OUTPUT_JS.stat().st_size / 1024:.1f} KB")


def add_existing_game_poems():
    """添加现有游戏的诗词数据"""
    print("正在添加现有游戏数据...")

    # 读取现有游戏的 poems.js
    game_poems_path = Path(__file__).parent.parent.parent / "xunhualing" / "poems.js"

    if not game_poems_path.exists():
        print(f"  未找到游戏数据文件: {game_poems_path}")
        return []

    # 读取并解析 poems.js
    content = game_poems_path.read_text(encoding='utf-8')

    # 提取 poems 数组
    match = re.search(r'const poems = \[(.*?)\];', content, re.DOTALL)
    if not match:
        print("  无法解析游戏数据文件")
        return []

    # 简单解析（实际项目中应该用更严格的方式）
    try:
        # 使用 eval 转换（注意：只对可信来源使用）
        poems_data = eval(f"[{match.group(1)}]")
    except:
        print("  解析游戏数据失败")
        return []

    records = []
    id_counter = 100000  # 使用不同的ID范围

    for poem in poems_data:
        title = poem.get("title", "未知")
        author = poem.get("author", "佚名")
        content = poem.get("content", "")

        # 移除标点
        content_clean = re.sub(r'[，。！？、；：""''（）《》]', '', content)

        # 检测类型
        if len(content_clean) == 10:
            poem_type = "五言"
            line1 = content_clean[:5]
            line2 = content_clean[5:]
        elif len(content_clean) == 14:
            poem_type = "七言"
            line1 = content_clean[:7]
            line2 = content_clean[7:]
        else:
            continue

        records.append({
            "id": id_counter,
            "type": poem_type,
            "line1": line1,
            "line2": line2,
            "combined": content_clean,
            "title": title,
            "author": author,
            "dynasty": "唐"
        })
        id_counter += 1

    print(f"  添加了 {len(records)} 条游戏数据")
    return records


def main():
    print("=" * 50)
    print("寻花令金手指 - 数据预处理工具")
    print("=" * 50)

    # 1. 下载原始数据
    all_poems = download_poetry_data()

    # 2. 提取诗句对
    records = extract_line_pairs(all_poems)

    # 3. 添加游戏现有数据
    game_records = add_existing_game_poems()
    records.extend(game_records)

    # 4. 构建倒排索引
    index = build_inverted_index(records)

    # 5. 生成 JavaScript 文件
    generate_js_file(records, index)

    print("=" * 50)
    print("处理完成！")
    print("=" * 50)

    # 清理临时文件
    if TEMP_DIR.exists():
        import shutil
        shutil.rmtree(TEMP_DIR)
        print("临时文件已清理")


if __name__ == "__main__":
    main()
