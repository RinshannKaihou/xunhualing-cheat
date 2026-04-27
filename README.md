# 寻花令金手指 (Xunhualing Poetry Cheat)

一个 Web 版唐诗搜索工具，帮助寻花令游戏玩家通过部分信息快速定位匹配的诗句。

## 在线使用

[https://rinshannkaihou.github.io/xunhualing-cheat/](https://rinshannkaihou.github.io/xunhualing-cheat/)

## 设计

界面采用 **Letterpress Folio** 风格 —— 米色纸页、朱砂印章、米字格、古籍排版，配合 EB Garamond 与 Noto Serif SC 字体。整页就是一张折本手稿。

## 功能特性

- **米字格输入** — 点击格子直接输入中文，支持 IME 输入法，键盘左右切换、空格清除
- **确定位置搜索** — 在指定位置填入已知字符，未知位置留空，如「春□□□□□□□□」
- **必含/排除过滤** — 输入必须包含或排除的字符，支持空格分隔多个
- **五言/七言切换** — 按诗句字数筛选，方块数量自动调整（10格/14格）
- **实时搜索** — 输入即搜索，200ms 防抖优化，毫秒级响应
- **结果高亮** — 自动高亮匹配的字符位置（朱砂色）
- **随机诗句** — 一键展示随机一联

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
├── index.html              # 主入口（Letterpress Folio 设计）
├── Folio.html              # 同上（命名版本）
├── variations/
│   ├── folio-app.jsx       # Folio React 组件
│   └── folio.css           # Folio 样式
├── shared/
│   ├── loader.js           # 异步加载搜索引擎与数据
│   └── use-search.jsx      # 共享 React Hook（搜索状态、IME 输入框）
├── data/
│   ├── search-engine.js    # 倒排索引搜索引擎（分阶段初始化）
│   ├── poem-dict.json      # 作者/标题字典
│   ├── poem-five.json      # 五言诗句紧凑数据
│   ├── poem-seven.json     # 七言诗句紧凑数据
│   ├── poems_five.json     # 源数据
│   ├── poems_seven.json    # 源数据
│   ├── dict.json           # 源字典
│   ├── build_compact.py    # 构建脚本（JSON → 紧凑 JSON）
│   └── ...                 # 其他数据处理脚本
└── README.md
```

## 本地开发

```bash
git clone https://github.com/RinshannKaihou/xunhualing-cheat.git
cd xunhualing-cheat
python3 -m http.server 8090
# 然后访问 http://localhost:8090/
```

> 因为搜索引擎与数据通过 `fetch()` 加载 JSON 文件，必须经由 HTTP 服务器，不能直接 `file://` 打开。

### 重新构建数据

```bash
cd data
python3 build_compact.py
```

## 数据来源

- [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) — 约 5.5 万首唐诗
- 共 208,245 联（143,092 五言 + 65,153 七言），覆盖 6,797 个汉字

## 技术栈

- **前端**：React 18（CDN）+ Babel Standalone（浏览器内编译）
- **数据加载**：原生 `fetch()` + 紧凑 JSON 格式
- **搜索引擎**：纯 JS 倒排索引（`Map<char, Set<idx>>`），支持位置正则匹配
- **样式**：原生 CSS，米字格通过 `linear-gradient` 实现，印章用 SVG `feTurbulence` 滤镜模拟手盖效果
- **字体**：EB Garamond（拉丁）+ Noto Serif SC（中文）

## 许可

MIT License
