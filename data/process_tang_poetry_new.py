#!/usr/bin/env python3
"""
寻花令金手指 - 处理全唐诗数据
智能断句并生成 JavaScript 数据库
"""

import re
import json
from pathlib import Path
from collections import defaultdict

# 项目路径
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent if (SCRIPT_DIR.name != "data") else SCRIPT_DIR
OUTPUT_JS = PROJECT_ROOT / "js" / "data.js"
LOCAL_TXT = SCRIPT_DIR / "temp" / "quantangshi.txt"


def process_tang_poetry():
    """处理全唐诗，智能断句"""
    print("正在处理全唐诗...")
    
    with open(LOCAL_TXT, 'r', encoding='gbk', errors='ignore') as f:
        content = f.read()
    
    # 按卷分割
    poems = []
    for line in content.split('\n'):
        line = line.strip()
        if not line:
            continue
        
        # 匹配标题行
        title_match = re.match(r'卷[\d_]+【(.+?)】(.+)', line)
        if title_match:
            # 保存上一首
            if poems and len(poems[-1].get('content_lines', [])) > 0:
                # 处理上一首的诗句
                process_poem_content(poems[-1], poems[-1]['title'], poems[-1]['author'])
            
            # 开始新诗
            poems.append({
                'title': title_match.group(1).strip(),
                'author': title_match.group(2).strip(),
                'content_lines': []
            })
        elif poems:
            # 添加诗句内容
            poems[-1]['content_lines'].append(line)
    
    # 处理最后一首
    if poems and len(poems[-1].get('content_lines', [])) > 0:
        process_poem_content(poems[-1], poems[-1]['title'], poems[-1]['author'])
    
    print(f"  解析了 {len(poems)} 首诗")
    return poems


def process_poem_content(poem, title, author):
    """处理单首诗的内容，智能断句"""
    content = ''.join(poem['content_lines'])
    
    # 移除标点
    clean_content = re.sub(r'[，。！？、；：""''（）《》\s]', '', content)
    
    if not clean_content:
        return
    
    # 使用更智能的断句算法
    lines = smart_extract_poem_lines(clean_content)
    
    # 更新诗的内容为处理后的行
    poem['content_lines'] = lines


def smart_extract_poem_lines(content):
    """
    智能断句算法
    返回: [(line1, line2), ...]
    """
    lines = []
    
    # 清理开头和结尾
    content = content.strip()
    
    # 尝试匹配5+5或7+7的句对
    # 五言：每句5字，两句10字
    # 七言：每句7字，两句14字
    
    # 策略1：先找明显的五言对（两连续的5字）
    # 策略2：再找七言对
    
    # 匹配五言对：两个连续的5字，都是纯中文
    for match in re.finditer(r'([\u4e00-\u9fa5]{5})([\u4e00-\u9fa5]{5})', content):
        lines.append((match.group(1), match.group(2)))
    
    # 匹配七言对：两个连续的7字，都是纯中文
    for match in re.finditer(r'([\u4e00-\u9fa5]{7})([\u4e00-\u9fa5]{7})', content):
        lines.append((match.group(1), match.group(2)))
    
    # 移除已匹配的字符，继续查找剩余内容
    remaining = content
    for line1, line2 in lines:
        remaining = remaining.replace(line1, '').replace(line2, '')
    
    # 在剩余内容中继续查找
    if len(remaining) >= 10:
        for match in re.finditer(r'([\u4e00-\u9fa5]{5})([\u4e00-\u9fa5]{5})', remaining):
            lines.append((match.group(1), match.group(2)))
            remaining = remaining.replace(match.group(1), '').replace(match.group(2), '')
            break
    
    if len(remaining) >= 14:
        for match in re.finditer(r'([\u4e00-\u9fa5]{7})([\u4e00-\u9fa5]{7})', remaining):
            lines.append((match.group(1), match.group(2)))
            remaining = remaining.replace(match.group(1), '').replace(match.group(2), '')
    
    return lines


def extract_line_pairs(poems):
    """从诗中提取相邻两句"""
    print("正在提取诗句对...")
    records = []
    id_counter = 1
    
    for poem in poems:
        title = poem.get("title", "未知")
        author = poem.get("author", "佚名")
        lines = poem.get("content_lines", [])
        
        for line1, line2 in lines:
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
// 全唐诗数据 - 自动生成

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


def main():
    print("=" * 50)
    print("寻花令金手指 - 智能断句处理")
    print("=" * 50)
    
    poems = process_tang_poetry()
    
    if not poems:
        print("没有解析到诗词，退出")
        return
    
    records = extract_line_pairs(poems)
    
    if not records:
        print("没有提取到诗句对，退出")
        return
    
    index = build_index(records)
    generate_js(records, index)
    
    # 清理临时文件
    if LOCAL_TXT.exists():
        LOCAL_TXT.unlink()
        print("临时文件已清理")
    
    print("\n" + "=" * 50)
    print("处理完成！")
    print("=" * 50)


if __name__ == "__main__":
    main()
