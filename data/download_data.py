#!/usr/bin/env python3
"""
寻花令金手指 - 数据下载脚本
使用多种数据源获取唐诗数据
"""

import json
import re
import time
from pathlib import Path

# 项目路径
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_JS = PROJECT_ROOT / "js" / "data.js"
GAME_POEMS_PATH = Path("/Users/ywang2397/Documents/xunhualing/poems.js")


def download_from_api():
    """从 API 获取唐诗数据（获取前1000首作为示例）"""
    import urllib.request

    print("正在从 API 获取唐诗数据...")
    records = []

    # 使用多个不同的 index 来获取不同的诗
    # API 格式: https://api.playgameoflife.live/v1/tang.json
    base_url = "https://api.playgameoflife.live/v1/tang.json"

    # 尝试获取多条记录（通过不同的请求）
    for i in range(500):
        try:
            # 添加随机参数避免缓存
            url = f"{base_url}?t={int(time.time() * 1000)}&r={i}"

            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            )

            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read())

                if 'Chinese' in data and 'content' in data['Chinese']:
                    poem = {
                        'title': data['Chinese'].get('title', ''),
                        'author': data['Chinese'].get('author', ''),
                        'content': ''.join(data['Chinese']['content'])
                    }
                    records.append(poem)

                    if (i + 1) % 50 == 0:
                        print(f"  已获取 {len(records)} 首...")

                time.sleep(0.1)  # 避免请求过快

        except Exception as e:
            if i < 10:  # 只打印前几个错误
                print(f"  请求 {i} 失败: {e}")
            continue

    print(f"从 API 获取了 {len(records)} 首诗")
    return records


def load_game_poems():
    """加载现有游戏的诗词"""
    print("正在加载游戏现有诗词...")

    if not GAME_POEMS_PATH.exists():
        print(f"  未找到游戏文件: {GAME_POEMS_PATH}")
        return []

    content = GAME_POEMS_PATH.read_text(encoding='utf-8')

    # 移除注释
    lines = []
    for line in content.split('\n'):
        # 跳过注释行
        if line.strip().startswith('//'):
            continue
        lines.append(line)
    content = '\n'.join(lines)

    # 移除 const 声明
    content = re.sub(r'const\s+poems\s*=\s*', '', content)

    # 移除尾部分号
    content = content.rstrip().rstrip(';')

    # 将 JavaScript 对象字面量转换为 JSON 格式
    # 需要给键添加双引号
    content = re.sub(r'(\w+)\s*:', r'"\1":', content)

    # 移除尾随逗号（JSON 不允许）
    content = re.sub(r',\s*}', '}', content)
    content = re.sub(r',\s*]', ']', content)

    try:
        poems_data = json.loads(content)
        print(f"  加载了 {len(poems_data)} 首游戏诗词")
        return poems_data
    except json.JSONDecodeError as e:
        # 尝试更简单的解析方法
        print(f"  JSON 解析失败，尝试手动解析...")
        return manual_parse_poems(content)


def manual_parse_poems(content):
    """手动解析诗词数据"""
    poems = []

    # 使用正则表达式提取每个诗词对象
    pattern = r'\{\s*title:\s*"([^"]+)"\s*,\s*author:\s*"([^"]+)"\s*,\s*content:\s*"([^"]+)"\s*\}'

    matches = re.findall(pattern, content)
    for match in matches:
        poems.append({
            "title": match[0],
            "author": match[1],
            "content": match[2]
        })

    print(f"  手动解析了 {len(poems)} 首游戏诗词")
    return poems


def add_common_poems(records):
    """添加一些常见的唐诗"""
    print("正在添加常见唐诗...")

    common_poems = [
        # 王维
        {"title": "鹿柴", "author": "王维", "content": "空山不见人，但闻人语响。返景入深林，复照青苔上。"},
        {"title": "竹里馆", "author": "王维", "content": "独坐幽篁里，弹琴复长啸。深林人不知，明月来相照。"},
        {"title": "送别", "author": "王维", "content": "山中相送罢，日暮掩柴扉。春草明年绿，王孙归不归？"},
        {"title": "相思", "author": "王维", "content": "红豆生南国，春来发几枝。愿君多采撷，此物最相思。"},
        {"title": "杂诗", "author": "王维", "content": "君自故乡来，应知故乡事。来日绮窗前，寒梅著花未？"},
        {"title": "九月九日忆山东兄弟", "author": "王维", "content": "独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。"},

        # 李白
        {"title": "静夜思", "author": "李白", "content": "床前明月光，疑是地上霜。举头望明月，低头思故乡。"},
        {"title": "赠汪伦", "author": "李白", "content": "李白乘舟将欲行，忽闻岸上踏歌声。桃花潭水深千尺，不及汪伦送我情。"},
        {"title": "黄鹤楼送孟浩然之广陵", "author": "李白", "content": "故人西辞黄鹤楼，烟花三月下扬州。孤帆远影碧空尽，唯见长江天际流。"},
        {"title": "早发白帝城", "author": "李白", "content": "朝辞白帝彩云间，千里江陵一日还。两岸猿声啼不住，轻舟已过万重山。"},
        {"title": "望庐山瀑布", "author": "李白", "content": "日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。"},
        {"title": "独坐敬亭山", "author": "李白", "content": "众鸟高飞尽，孤云独去闲。相看两不厌，只有敬亭山。"},
        {"title": "夜宿山寺", "author": "李白", "content": "危楼高百尺，手可摘星辰。不敢高声语，恐惊天上人。"},

        # 杜甫
        {"title": "春望", "author": "杜甫", "content": "国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。烽火连三月，家书抵万金。白头搔更短，浑欲不胜簪。"},
        {"title": "绝句", "author": "杜甫", "content": "两个黄鹂鸣翠柳，一行白鹭上青天。窗含西岭千秋雪，门泊东吴万里船。"},
        {"title": "江畔独步寻花", "author": "杜甫", "content": "黄四娘家花满蹊，千朵万朵压枝低。留连戏蝶时时舞，自在娇莺恰恰啼。"},
        {"title": "绝句二首", "author": "杜甫", "content": "迟日江山丽，春风花草香。泥融飞燕子，沙暖睡鸳鸯。"},
        {"title": "春夜喜雨", "author": "杜甫", "content": "好雨知时节，当春乃发生。随风潜入夜，润物细无声。野径云俱黑，江船火独明。晓看红湿处，花重锦官城。"},
        {"title": "旅夜书怀", "author": "杜甫", "content": "细草微风岸，危樯独夜舟。星垂平野阔，月涌大江流。名岂文章著，官应老病休。飘飘何所似，天地一沙鸥。"},

        # 白居易
        {"title": "赋得古原草送别", "author": "白居易", "content": "离离原上草，一岁一枯荣。野火烧不尽，春风吹又生。远芳侵古道，晴翠接荒城。又送王孙去，萋萋满别情。"},
        {"title": "池上", "author": "白居易", "content": "小娃撑小艇，偷采白莲回。不解藏踪迹，浮萍一道开。"},
        {"title": "忆江南", "author": "白居易", "content": "江南好，风景旧曾谙。日出江花红胜火，春来江水绿如蓝。能不忆江南？"},

        # 孟浩然
        {"title": "春晓", "author": "孟浩然", "content": "春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。"},
        {"title": "宿建德江", "author": "孟浩然", "content": "移舟泊烟渚，日暮客愁新。野旷天低树，江清月近人。"},
        {"title": "过故人庄", "author": "孟浩然", "content": "故人具鸡黍，邀我至田家。绿树村边合，青山郭外斜。开轩面场圃，把酒话桑麻。待到重阳日，还来就菊花。"},

        # 王之涣
        {"title": "登鹳雀楼", "author": "王之涣", "content": "白日依山尽，黄河入海流。欲穷千里目，更上一层楼。"},
        {"title": "凉州词", "author": "王之涣", "content": "黄河远上白云间，一片孤城万仞山。羌笛何须怨杨柳，春风不度玉门关。"},

        # 杜牧
        {"title": "山行", "author": "杜牧", "content": "远上寒山石径斜，白云生处有人家。停车坐爱枫林晚，霜叶红于二月花。"},
        {"title": "清明", "author": "杜牧", "content": "清明时节雨纷纷，路上行人欲断魂。借问酒家何处有？牧童遥指杏花村。"},
        {"title": "江南春", "author": "杜牧", "content": "千里莺啼绿映红，水村山郭酒旗风。南朝四百八十寺，多少楼台烟雨中。"},

        # 李商隐
        {"title": "乐游原", "author": "李商隐", "content": "向晚意不适，驱车登古原。夕阳无限好，只是近黄昏。"},
        {"title": "夜雨寄北", "author": "李商隐", "content": "君问归期未有期，巴山夜雨涨秋池。何当共剪西窗烛，却话巴山夜雨时。"},
        {"title": "嫦娥", "author": "李商隐", "content": "云母屏风烛影深，长河渐落晓星沉。嫦娥应悔偷灵药，碧海青天夜夜心。"},
        {"title": "无题", "author": "李商隐", "content": "相见时难别亦难，东风无力百花残。春蚕到死丝方尽，蜡炬成灰泪始干。"},

        # 柳宗元
        {"title": "江雪", "author": "柳宗元", "content": "千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。"},

        # 王昌龄
        {"title": "出塞", "author": "王昌龄", "content": "秦时明月汉时关，万里长征人未还。但使龙城飞将在，不教胡马度阴山。"},
        {"title": "从军行", "author": "王昌龄", "content": "青海长云暗雪山，孤城遥望玉门关。黄沙百战穿金甲，不破楼兰终不还。"},
        {"title": "芙蓉楼送辛渐", "author": "王昌龄", "content": "寒雨连江夜入吴，平明送客楚山孤。洛阳亲友如相问，一片冰心在玉壶。"},

        # 贺知章
        {"title": "回乡偶书", "author": "贺知章", "content": "少小离家老大回，乡音无改鬓毛衰。儿童相见不相识，笑问客从何处来。"},
        {"title": "咏柳", "author": "贺知章", "content": "碧玉妆成一树高，万条垂下绿丝绦。不知细叶谁裁出，二月春风似剪刀。"},

        # 其他
        {"title": "游子吟", "author": "孟郊", "content": "慈母手中线，游子身上衣。临行密密缝，意恐迟迟归。谁言寸草心，报得三春晖。"},
        {"title": "寻隐者不遇", "author": "贾岛", "content": "松下问童子，言师采药去。只在此山中，云深不知处。"},
        {"title": "枫桥夜泊", "author": "张继", "content": "月落乌啼霜满天，江枫渔火对愁眠。姑苏城外寒山寺，夜半钟声到客船。"},
        {"title": "滁州西涧", "author": "韦应物", "content": "独怜幽草涧边生，上有黄鹂深树鸣。春潮带雨晚来急，野渡无人舟自横。"},
        {"title": "乌衣巷", "author": "刘禹锡", "content": "朱雀桥边野草花，乌衣巷口夕阳斜。旧时王谢堂前燕，飞入寻常百姓家。"},
        {"title": "望洞庭", "author": "刘禹锡", "content": "湖光秋月两相和，潭面无风镜未磨。遥望洞庭山水翠，白银盘里一青螺。"},
        {"title": "竹枝词", "author": "刘禹锡", "content": "杨柳青青江水平，闻郎江上唱歌声。东边日出西边雨，道是无晴却有晴。"},
        {"title": "题都城南庄", "author": "崔护", "content": "去年今日此门中，人面桃花相映红。人面不知何处去，桃花依旧笑春风。"},
        {"title": "金缕衣", "author": "杜秋娘", "content": "劝君莫惜金缕衣，劝君惜取少年时。花开堪折直须折，莫待无花空折枝。"},
    ]

    records.extend(common_poems)
    print(f"  添加了 {len(common_poems)} 首常见唐诗")
    return records


def extract_line_pairs(poems):
    """从诗中提取相邻两句"""
    print("正在提取诗句对...")
    records = []
    id_counter = 1

    for poem in poems:
        title = poem.get("title", "未知")
        author = poem.get("author", "佚名")
        content = poem.get("content", "")

        # 移除标点
        content_clean = re.sub(r'[，。！？、；：""''（）《》\s]', '', content)

        # 判断类型
        if len(content_clean) == 10:
            poem_type = "五言"
            line1 = content_clean[:5]
            line2 = content_clean[5:]
        elif len(content_clean) == 14:
            poem_type = "七言"
            line1 = content_clean[:7]
            line2 = content_clean[7:]
        elif len(content_clean) == 20:
            poem_type = "五言"
            # 五言律诗提取多对
            for i in range(0, 20, 10):
                records.append({
                    "id": id_counter,
                    "type": poem_type,
                    "line1": content_clean[i:i+5],
                    "line2": content_clean[i+5:i+10],
                    "combined": content_clean[i:i+10],
                    "title": title,
                    "author": author,
                    "dynasty": "唐"
                })
                id_counter += 1
            continue
        elif len(content_clean) == 28:
            poem_type = "七言"
            # 七言律诗提取多对
            for i in range(0, 28, 14):
                records.append({
                    "id": id_counter,
                    "type": poem_type,
                    "line1": content_clean[i:i+7],
                    "line2": content_clean[i+7:i+14],
                    "combined": content_clean[i:i+14],
                    "title": title,
                    "author": author,
                    "dynasty": "唐"
                })
                id_counter += 1
            continue
        else:
            # 尝试按句分割
            lines = re.split(r'[，。！？、；：""''（）、《》]', content)
            lines = [l.strip() for l in lines if l.strip() and len(l.strip()) in [5, 7]]

            if len(lines) >= 2:
                # 取相邻两句
                for i in range(0, len(lines) - 1, 2):
                    if i + 1 < len(lines):
                        line1 = re.sub(r'[^\u4e00-\u9fa5]', '', lines[i])
                        line2 = re.sub(r'[^\u4e00-\u9fa5]', '', lines[i+1])

                        if len(line1) == 5 and len(line2) == 5:
                            poem_type = "五言"
                        elif len(line1) == 7 and len(line2) == 7:
                            poem_type = "七言"
                        else:
                            continue

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

    type_counts = {"五言": 0, "七言": 0}
    for r in records:
        type_counts[r["type"]] = type_counts.get(r["type"], 0) + 1

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

console.log('数据库已加载，共', POEM_RECORDS.length, '条记录');
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
    print("寻花令金手指 - 数据下载工具")
    print("=" * 50)

    # 收集所有诗词
    all_poems = []

    # 1. 加载游戏现有诗词
    all_poems.extend(load_game_poems())

    # 2. 添加常见唐诗
    all_poems = add_common_poems(all_poems)

    # 3. 尝试从 API 获取更多（可选，较慢）
    # api_poems = download_from_api()
    # all_poems.extend(api_poems)

    # 去重
    seen = set()
    unique_poems = []
    for poem in all_poems:
        key = (poem["title"], poem["author"], poem["content"])
        if key not in seen:
            seen.add(key)
            unique_poems.append(poem)

    print(f"\n去重后共有 {len(unique_poems)} 首诗")

    # 提取诗句对
    records = extract_line_pairs(unique_poems)

    # 构建索引
    index = build_index(records)

    # 生成 JS 文件
    generate_js(records, index)

    print("\n" + "=" * 50)
    print("处理完成！")
    print("=" * 50)


if __name__ == "__main__":
    main()
