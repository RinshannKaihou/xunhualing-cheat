# 寻花令 (Xunhualing) 游戏完整分析文档

## 1. 项目概述

**寻花令** 是一个基于 Web 的唐诗猜词游戏，玩法类似于 Wordle。玩家需要通过逐个字符的猜测来还原完整的唐诗诗句。

### 1.1 项目结构

```
xunhualing/
├── index.html          # 主游戏文件（包含 HTML/CSS/JS）
├── poems.js            # 诗词数据库（227首唐诗）
└── xunhualing-cordova/ # Cordova 移动端项目
    └── xunhualing/
        ├── www/        # Web 资源（与根目录相同）
        ├── platforms/  # 平台特定代码（Android/iOS）
        └── config.xml  # Cordova 配置
```

## 2. 游戏核心机制

### 2.1 游戏流程

```
开始 → 随机选择诗词 → 玩家输入猜测 → 提交验证 → 反馈结果 → 重复直到猜对或次数用尽
```

### 2.2 游戏规则

1. **目标**：猜出系统随机选择的一句唐诗
2. **输入**：玩家输入与答案长度相等的字符序列
3. **次数限制**：最多 20 次猜测机会
4. **重复检测**：不允许重复提交相同的猜测
5. **标点处理**：答案会去除所有标点符号后进行比对

### 2.3 反馈系统（Wordle 风格）

| 颜色 | 含义 | CSS类 |
|------|------|-------|
| 绿色 | 字符正确且位置正确 | `.correct` |
| 黄色 | 字符存在但位置错误 | `.present` |
| 灰色 | 字符不存在于答案中 | `.absent` |

## 3. 数据结构

### 3.1 诗词数据结构 (poems.js)

```javascript
{
    title: "诗题",        // 诗的标题
    author: "作者",       // 诗人姓名
    content: "诗句内容，带标点"  // 诗句（含标点）
}
```

### 3.2 诗词分类（按长度）

| 字符数 | 类型 | 说明 |
|--------|------|------|
| 10 | 五言绝句 | 两句，每句5字 |
| 14 | 七言绝句 | 两句，每句7字 |
| 20 | 五言律诗 | 四句，每句5字 |
| 28 | 七言律诗 | 四句，每句7字 |

### 3.3 游戏状态变量

```javascript
let currentPoem = null;     // 当前选择的诗词对象
let currentAnswer = '';     // 去除标点后的答案
let guesses = [];           // 历史猜测记录
let testedChars = {};       // 已测试字符状态映射
let gameOver = false;       // 游戏结束标志
let currentInput = '';      // 当前输入内容
```

### 3.4 猜测结果结构

```javascript
// guesses 数组中的每个元素结构
[
    { char: "字", status: "correct" },    // 绿色
    { char: "符", status: "present" },    // 黄色
    { char: "状", status: "absent" }      // 灰色
]
```

## 4. 核心算法

### 4.1 processGuess() - 猜测处理算法

```javascript
function processGuess(guess) {
    const result = [];
    const answer = currentAnswer;
    const guessChars = guess.split('');
    const answerChars = answer.split('');

    // 步骤1: 统计答案中每个字符的出现次数
    const charCount = {};
    for (const char of answerChars) {
        charCount[char] = (charCount[char] || 0) + 1;
    }

    // 步骤2: 第一遍扫描 - 标记位置正确的字符（绿色）
    const tempCount = { ...charCount };
    const status = new Array(guess.length).fill('absent');

    for (let i = 0; i < guess.length; i++) {
        if (guessChars[i] === answerChars[i]) {
            status[i] = 'correct';
            tempCount[guessChars[i]]--;
        }
    }

    // 步骤3: 第二遍扫描 - 标记存在但位置错误的字符（黄色）
    for (let i = 0; i < guess.length; i++) {
        if (status[i] !== 'correct' && tempCount[guessChars[i]] > 0) {
            status[i] = 'present';
            tempCount[guessChars[i]]--;
        }
    }

    // 步骤4: 构建结果并更新 testedChars
    for (let i = 0; i < guess.length; i++) {
        result.push({
            char: guessChars[i],
            status: status[i]
        });

        // 更新字符状态（保留最佳状态）
        if (!testedChars[guessChars[i]]) {
            testedChars[guessChars[i]] = status[i];
        } else if (testedChars[guessChars[i]] === 'absent' && status[i] !== 'absent') {
            testedChars[guessChars[i]] = status[i];
        } else if (testedChars[guessChars[i]] === 'present' && status[i] === 'correct') {
            testedChars[guessChars[i]] = 'correct';
        }
    }

    return result;
}
```

### 4.2 算法关键点

1. **重复字符处理**：使用计数器确保重复字符的标记正确
2. **状态优先级**：correct > present > absent
3. **字符状态更新**：保留每个字符在所有猜测中的最佳状态

## 5. 主要函数

### 5.1 startGame()

```javascript
function startGame() {
    // 1. 随机选择诗词
    currentPoem = poems[Math.floor(Math.random() * poems.length)];

    // 2. 去除标点生成答案
    currentAnswer = currentPoem.content.replace(/[，。！？、；：""''（）《》]/g, '');

    // 3. 重置游戏状态
    guesses = [];
    testedChars = {};
    gameOver = false;
    currentInput = '';

    // 4. 更新 UI
    // - 显示诗词类型（五言/七言/律诗）
    // - 重置剩余次数为20
    // - 清空网格和字符状态
}
```

### 5.2 submitGuess()

```javascript
function submitGuess() {
    // 1. 获取并清理输入
    const guess = input.value.trim().replace(/[标点]/g, '');

    // 2. 验证输入
    // - 非空检查
    // - 长度匹配检查
    // - 重复猜测检查

    // 3. 处理猜测
    const result = processGuess(guess);
    guesses.push(result);

    // 4. 更新 UI
    // - 更新剩余次数
    // - 渲染网格（带动画）
    // - 更新已测字符

    // 5. 检查胜负
    // - 全部 correct：胜利
    // - 达到20次：失败
}
```

### 5.3 renderGrid()

```javascript
function renderGrid() {
    // 1. 渲染历史猜测行
    for (let i = 0; i < guesses.length; i++) {
        // 创建已提交的猜测行，带有颜色状态
    }

    // 2. 渲染当前输入行（游戏未结束时）
    if (!gameOver) {
        // 显示当前正在输入的字符
    }

    // 3. 渲染空提示行
    // 显示最多6行空行作为提示
}
```

### 5.4 updateTestedChars()

```javascript
function updateTestedChars() {
    // 按状态排序显示：correct → present → absent
    const sortedChars = Object.keys(testedChars).sort((a, b) => {
        const statusOrder = { correct: 0, present: 1, absent: 2 };
        return statusOrder[testedChars[a]] - statusOrder[testedChars[b]] || a.localeCompare(b);
    });

    // 渲染字符标签
}
```

## 6. UI 组件

### 6.1 主要 DOM 元素

| 元素 ID | 用途 |
|---------|------|
| `poemType` | 显示诗词类型 |
| `attempts` | 显示剩余次数 |
| `guessGrid` | 猜测网格容器 |
| `guessInput` | 输入框 |
| `submitBtn` | 提交按钮 |
| `startBtn` | 开始/重新开始按钮 |
| `testedChars` | 已测字符显示区 |
| `message` | 消息提示区 |
| `resultDetails` | 结果详情区 |

### 6.2 CSS 类

| 类名 | 用途 |
|------|------|
| `.guess-grid` | 网格容器 |
| `.guess-row` | 猜测行 |
| `.guess-cell` | 字符格子 |
| `.correct/.present/.absent` | 三种状态样式 |
| `.current` | 当前输入行 |
| `.revealing` | 翻转动画 |
| `.char-tag` | 字符标签 |

## 7. 事件监听

```javascript
// 1. 输入事件 - 实时显示
document.getElementById('guessInput').addEventListener('input', function(e) {
    const value = e.target.value.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '');
    currentInput = value;
    renderGrid();
});

// 2. 回车提交
document.getElementById('guessInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        submitGuess();
    }
});

// 3. 按钮点击
// - submitBtn.onclick = submitGuess
// - startBtn.onclick = startGame
```

## 8. 标点符号处理

### 8.1 被移除的标点

```javascript
/[，。！？、；：""''（）《》]/g
```

包括：逗号、句号、感叹号、问号、顿号、分号、冒号、引号、括号、书名号

### 8.2 处理时机

1. **答案生成时**：从诗词内容中移除标点
2. **玩家输入时**：移除标点后再进行比对

## 9. 胜负判定

### 9.1 胜利条件

```javascript
const isCorrect = result.every(cell => cell.status === 'correct');
if (isCorrect) {
    // 胜利处理
}
```

### 9.2 失败条件

```javascript
if (guesses.length >= 20) {
    // 失败处理
}
```

## 10. 诗词数据库统计

| 类别 | 数量 |
|------|------|
| 五言古诗 | 20首 |
| 七言古诗 | 20首 |
| 五言律诗 | 30首 |
| 七言律诗 | 47首 |
| 五言绝句 | 35首 |
| 七言绝句 | 75首 |
| **总计** | **227首** |

### 主要诗人

- 李白（多首）
- 杜甫（多首）
- 王维（多首）
- 白居易（多首）
- 李商隐（多首）
- 刘禹锡（多首）
- 杜牧（多首）
- 孟浩然
- 王昌龄
- 岑参
- 等...

## 11. 金手指开发要点

### 11.1 可利用的信息

1. **答案存储位置**：`currentAnswer` 变量
2. **诗词数据**：`poems` 数组（全局可访问）
3. **当前诗词对象**：`currentPoem` 变量

### 11.2 可能的作弊方式

```javascript
// 方式1: 直接获取答案
console.log(currentAnswer);

// 方式2: 获取完整诗词信息
console.log(currentPoem);  // 包含 title, author, content

// 方式3: 遍历所有诗词
console.log(poems);

// 方式4: 监控猜测结果
// 可以在 processGuess 后查看 status 数组
```

### 11.3 关键函数位置

| 功能 | 函数 | 行号 |
|------|------|------|
| 游戏开始 | `startGame()` | 375-407 |
| 提交猜测 | `submitGuess()` | 466-536 |
| 处理算法 | `processGuess()` | 538-587 |
| 渲染网格 | `renderGrid()` | 409-464 |
| 字符状态 | `updateTestedChars()` | 589-605 |
| 显示结果 | `showResult()` | 613-625 |

## 12. 移动端适配

### 12.1 响应式断点

```css
@media (max-width: 600px) {
    .guess-cell { width: 32px; height: 32px; }
    h1 { font-size: 2rem; }
}

@media (max-width: 380px) {
    .guess-cell { width: 28px; height: 28px; }
}
```

### 12.2 Cordova 项目

- 支持 Android 和 iOS 平台
- 使用 Apache Cordova 将 Web 应用打包为原生应用
- 预编译的 APK 文件可用（v1.0.0 和 v1.0.1）

## 13. 安全性分析

### 13.1 客户端限制

所有游戏逻辑都在客户端执行，包括：
- 答案生成
- 猜测验证
- 胜负判定

### 13.2 无服务器验证

游戏没有任何后端交互，所有状态都存储在 JavaScript 变量中，因此：

1. **答案可直接访问**：`currentAnswer` 全局变量
2. **无防作弊机制**：没有服务器端验证
3. **状态可修改**：所有游戏状态都可以通过控制台修改

## 14. 开发金手指的建议方案

### 方案 A: 浏览器控制台脚本

```javascript
// 直接显示答案
function revealAnswer() {
    console.log('答案:', currentAnswer);
    console.log('完整信息:', currentPoem);
    return currentAnswer;
}
```

### 方案 B: 浏览器扩展

创建一个浏览器扩展，注入脚本显示答案按钮。

### 方案 C: 修改游戏代码

在原游戏基础上添加"提示"功能。

---

**文档生成时间**: 2026-02-10
**分析版本**: xunhualing (基于 index.html 和 poems.js)
