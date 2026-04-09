# 寻花令金手指 (Xunhualing Poetry Cheat)

一个 Web 版唐诗搜索工具，帮助寻花令游戏玩家通过部分信息快速定位匹配的诗句。

## 在线使用

[https://rinshannkaihou.github.io/xunhualing-cheat/](https://rinshannkaihou.github.io/xunhualing-cheat/)

## 功能特性

- **方块输入** — 点击方块直接输入中文，支持 IME 输入法，键盘左右切换、空格清除
- **确定位置搜索** — 在指定位置填入已知字符，未知位置留空，如「春□□□□□□□□」
- **必含/排除过滤** — 输入必须包含或排除的字符，支持空格分隔多个
- **五言/七言切换** — 按诗句字数筛选，方块数量自动调整（10格/14格）
- **实时搜索** — 输入即搜索，300ms 防抖优化，毫秒级响应
- **结果高亮** — 自动高亮匹配的字符位置
- **一键复制** — 点击即可复制诗句文本
- **随机诗句** — 随机展示一条诗句
- **搜索状态持久化** — 刷新页面自动恢复上次搜索条件

## 使用示例

**确定位置搜索**：在方块中填入已知字符
```
春 □ □ □ □ □ □ □ □
→ 春眠不觉晓，处处闻啼鸟
```

**组合搜索**：方块 + 必含文字
```
□ □ □ 明月  +  必含：光
→ 床前明月光，疑是地上霜
```

## 项目结构

```
xunhualing-cheat/
├── index.html              # 主页面
├── css/
│   └── style.css           # 样式
├── js/
│   ├── poem-dict.js        # 作者/标题字典（由构建脚本生成）
│   ├── poem-five.js        # 五言诗句紧凑数据
│   ├── poem-seven.js       # 七言诗句紧凑数据
│   ├── search-engine.js    # 倒排索引搜索引擎
│   └── app.js              # 应用逻辑与交互
├── data/
│   ├── poems_five.json     # 五言诗句源数据
│   ├── poems_seven.json    # 七言诗句源数据
│   ├── dict.json           # 作者/标题字典
│   ├── build_compact.py    # 数据构建脚本（JSON → JS）
│   ├── download_data.py    # 数据下载脚本
│   └── ...                 # 其他处理脚本
└── README.md
```

## 本地开发

1. 克隆仓库
   ```bash
   git clone https://github.com/RinshannKaihou/xunhualing-cheat.git
   ```
2. 用浏览器打开 `index.html` 即可使用

### 重新构建数据

```bash
cd data
python build_compact.py
```

这会将 `data/` 下的 JSON 源数据构建为 `js/` 下的紧凑 JS 文件。

## 数据来源

- [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) — 约 5.5 万首唐诗
- 游戏内置诗词数据

## 技术栈

纯前端静态网站，无框架依赖：
- HTML5 + CSS3（渐变、卡片布局、响应式）
- 原生 JavaScript
- 紧凑数据格式 + 倒排索引实现高速搜索

## 许可

MIT License
