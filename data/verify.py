import json
import re

with open('../js/data.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 提取POEM_RECORDS
match = re.search(r'const POEM_RECORDS = (\[.*?\]);', content, re.DOTALL)
if match:
    records = json.loads(match.group(1))
    problem = next((r for r in records if r['combined'].find('人不见愁人心含') >= 0), None)
    if problem:
        print('问题诗句仍存在:')
        print(f'  id: {problem["id"]}')
        print(f'  line1: {problem["line1"]}')
        print(f'  line2: {problem["line2"]}')
        print(f'  combined: {problem["combined"]}')
    else:
        print('问题诗句已修复')
