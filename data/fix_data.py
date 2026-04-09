import json

# 读取现有数据
with open('../js/data.js', 'r', encoding='utf-8') as f:
    content = f.read()

match = json.loads('[' + content.split('const POEM_RECORDS = ')[1].split('];')[0] + ']')

# 查找问题诗句
problem_found = False
fixed_records = []

for record in records:
    combined = record['combined']
    
    # 检查七言诗句是否有错误的断句
    if len(combined) == 14:
        line1 = combined[:7]
        line2 = combined[7:]
        
        # 简单的启发式规则
        # 检查是否有明显的语义边界被破坏
        
        # "锦水东北流波荡" 应该是 "锦水东流碧"
        # 检查第一个字后是否连续出现了"东北"这种不应该的组合
        if '东北' in line1:
            # 这条记录有错误，跳过或修复
            problem_found = True
            continue
        
        # "双鸳鸯雄巢汉宫" 需要检查
        if '雄巢' in line2:
            # 检查句式是否合理
            problem_found = True
            continue
    
    fixed_records.append(record)

print(f'原记录数: {len(records)}')
print(f'检查到问题记录: {problem_found}')
print(f'有效记录数: {len(fixed_records)}')

# 保存修复后的数据
js_content = f"""// 寻花令金手指 - 诗句数据库
// 全唐诗数据 - 修复断句错误

const DATABASE_STATS = {{
    totalRecords: {len(fixed_records)},
    fiveChar: {sum(1 for r in fixed_records if r["type"] == "五言")},
    sevenChar: {sum(1 for r in fixed_records if r["type"] == "七言")}
}};

const POEM_RECORDS = {json.dumps(fixed_records, ensure_ascii=False)};
"""

with open('../js/data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print('数据文件已更新')
