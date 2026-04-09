# 寻花令金手指 (Xunhualing Poetry Cheat)

一个Web版的唐诗查询工具，帮助玩家通过部分信息快速查找匹配的诗句。

## 功能特性

- **确定位置搜索**：使用 `?` 通配符表示任意字符，如 `春??不??` 表示"春XX不XX"
- **必含文字过滤**：输入必须包含的字符，如 `山 水`
- **排除文字过滤**：输入必须排除的字符
- **组合搜索**：支持多种条件组合使用
- **实时搜索**：输入即搜索，带防抖优化
- **结果高亮**：自动高亮匹配的字符
- **一键复制**：点击复制按钮快速复制结果
- **随机诗句**：获取随机诗句作为练习

## 在线使用

直接在浏览器中打开 `index.html` 即可使用。

## 本地运行

1. 克隆或下载项目
2. 在浏览器中打开 `index.html`
3. 开始使用！

### 获取完整数据

当前包含的是100条示例数据。要获取完整的唐诗数据库（约5.5万首），运行：

```bash
cd data
python process.py
```

这将：
- 从 [chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) 下载唐诗数据
- 处理并生成 `js/data.js` 文件
- 添加现有游戏的诗词数据

## 使用示例

### 示例1：确定位置搜索
输入模式：`春??不??`（五言）
```
结果：春眠不觉晓，处处闻啼鸟
```

### 示例2：必含文字
输入必含：`山 水`
```
结果：
- 空山不见人，但闻人语响
- 山光忽西下，池月渐东上
- ...
```

### 示例3：组合搜索
模式：`????明月` + 必含：`光`
```
结果：山光忽西下，池月渐东上（不匹配）
需要调整搜索条件...
```

## 项目结构

```
xunhualing-cheat/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── data.js         # 诗句数据库（由process.py生成）
│   ├── search.js       # 搜索算法
│   └── app.js          # 应用逻辑
├── data/
│   ├── process.py      # 数据预处理脚本
│   └── raw/            # 原始数据文件
└── README.md
```

## 数据来源

- **主数据源**：[chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) - 5.5万首唐诗
- **补充数据**：现有游戏227首诗词

## 技术栈

- HTML5
- CSS3 (渐变背景、卡片设计、响应式布局)
- 原生 JavaScript (无框架依赖)

## 浏览器兼容性

- Chrome/Edge (推荐)
- Firefox
- Safari
- 其他现代浏览器

## 开发

### 添加新数据

编辑 `data/process.py`，然后重新运行：
```bash
python data/process.py
```

### 自定义样式

编辑 `css/style.css` 中的 CSS 变量：
```css
:root {
    --bg-gradient: linear-gradient(...);
    --accent-pink: #f093fb;
    /* ... */
}
```

## 许可

本项目遵循 MIT 许可证。

数据来源：
- [chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) - MIT License

## 相关项目

- [寻花令游戏](https://github.com/yourusername/xunhualing) - 原游戏项目
