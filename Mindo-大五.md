# Mindo 大五人格模块 — 完整文档

## 一、算法

### 1.1 题库

- IPIP-NEO-120（Johnson 2014），120题，4轮×30题交叉排列
- 字典：`packages/core/src/psychology/bigfive/dictionary.ts`
- 已100%对照 `@alheimsins/b5-johnson-120-ipip-neo-pi-r` 官方包验证，零错误

### 1.2 计分逻辑

```
1. 用questionId匹配dictionary
2. direction=1：actualScore = answer.score
3. direction=-1：actualScore = 6 - answer.score
4. 按domain/facet分组累加
5. 输出BigFiveReport（5个domain，30个facet）

```

### 1.3 标准分

- T分 = 50 + 10×Z
- 常模来源：`bigfive_norms` 表（region/gender/age_group 15级级联匹配）
- 质性标签阈值：±1.5/±0.5 标准差

## 二、颜色系统（单一真相：`src/lib/bigfive-constants.ts`）

这份颜色规范此前只在对话里提过一次，从未被正式写进任何文档，这次借拆分文档的机会正式补齐。

### 2.1 五个维度的颜色

```typescript
BIGFIVE_COLORS = {
  OPENNESS:          '#8E44AD',  // 开放性——紫
  CONSCIENTIOUSNESS: '#2980B9',  // 尽责性——蓝
  EXTRAVERSION:      '#E67E22',  // 外向性——橙
  AGREEABLENESS:     '#1ABC9C',  // 宜人性——青绿
  NEUROTICISM:       '#E74C3C',  // 神经质——红
}

```

**这套颜色是大五模块独有的**，跟八字的五行颜色、以后紫微斗数可能会有的另一套颜色系统，各自独立，互不复用——每个模块各自有各自的调色板，不存在"哪个是主色板、其他模块套用它"这种关系。

### 2.2 维度顺序：OCEAN，顶部O顺时针

```typescript
DOMAIN_ORDER = ['OPENNESS', 'CONSCIENTIOUSNESS', 'EXTRAVERSION', 'AGREEABLENESS', 'NEUROTICISM']

```

这个顺序不只是数组排列顺序，同时也是**雷达图/玫瑰图这类可视化组件上，五个维度实际摆放的角度顺序**（从顶部开始，顺时针依次是O→C→E→A→N）。

### 2.3 每个维度下的六个子维度（facet）

```typescript
DOMAIN_FACETS = {
  OPENNESS:          ['Imagination', 'ArtisticInterests', 'Emotionality', 'Adventurousness', 'Intellect', 'Liberalism'],
  CONSCIENTIOUSNESS: ['SelfEfficacy', 'Orderliness', 'Dutifulness', 'AchievementStriving', 'SelfDiscipline', 'Cautiousness'],
  EXTRAVERSION:      ['Friendliness', 'Gregariousness', 'Assertiveness', 'ActivityLevel', 'ExcitementSeeking', 'Cheerfulness'],
  AGREEABLENESS:     ['Trust', 'Morality', 'Altruism', 'Cooperation', 'Modesty', 'Sympathy'],
  NEUROTICISM:       ['Anxiety', 'Anger', 'Depression', 'SelfConsciousness', 'Immoderation', 'Vulnerability'],
}

```

每组内部的排列顺序，沿用IPIP官方原始排列，不是随意排的，不要因为某个facet名字看着该排在别处就调整顺序。

### 2.4 全称/字母缩写互查表

```typescript
// domain_scores这个数据库字段用字母key存储（O/C/E/A/N），不是全称
DOMAIN_LETTER: { OPENNESS: 'O', CONSCIENTIOUSNESS: 'C', EXTRAVERSION: 'E', AGREEABLENESS: 'A', NEUROTICISM: 'N' }

// 反向查表，由DOMAIN_LETTER自动生成，不手写第二份
DOMAIN_FULL = Object.fromEntries(Object.entries(DOMAIN_LETTER).map(([full, letter]) => [letter, full]))

```

**值得记录的小细节**：`DOMAIN_FULL`不是手写的第二份映射表，是从`DOMAIN_LETTER`自动反向生成的——以后如果要调整某个维度的字母缩写，只需要改`DOMAIN_LETTER`这一处，`DOMAIN_FULL`自动跟着对，不存在"改了一份、忘了同步另一份"的风险。这是"单一数据源"原则在小处的具体应用，以后新增类似的双向映射表，可以照这个写法来，不要手写两份对照表。

## 三、前端架构

### 3.1 组件

- `components/modules/bigfive/BigFiveChart.tsx`——仪表盘卡片，`COLS=2 ROWS=2`（卡片系统通用规则见`CLAUDE.md`，此处不重复），双击展开弹窗modal查看完整雷达图/facet细节。内部状态：`standardScores`，通过`useEffect`+`fetch`拉取常模对比结果
- `components/modules/bigfive/BigFiveIntro.tsx`——测试正式开始前的介绍页，承担两个额外功能：
  - **地区选择**：用于常模匹配（`bigfive_norms`表的region级联查询需要知道用户所在地区），复用城市搜索组件（防抖`useState`+`useEffect`+`fetch`，跟onboarding的`CityPicker.tsx`是同一套搜索交互模式，但各自独立实现，不是共用同一个组件实例）
  - **导入历史结果**：允许用户导入之前测过的结果，避免重复答120道题

### 3.2 页面：`app/[locale]/dashboard/(os)/assessments/bigfive/page.tsx`

四态流程：`intro`（介绍页，见3.1）→ `quiz`（答题中）→ `submitting`（提交中）→ `result`（结果展示）。进页面时会先查一次有没有缓存的结果（`checkingCache`状态），有则跳过intro/quiz直接到result。提交答卷时`fetch` POST触发计分。

### 3.3 数据流

```
用户答完120题 → POST提交 → 后端按1.2节逻辑计分 → 存入bigfive_assessments
（domain_scores/facet_scores，region/gender/age_group一并记录用于后续常模匹配）
→ 前端拉常模对比结果（1.3节标准分）→ 渲染雷达图/facet细节

```

## 四、AI 解读功能——尚未开工，占位记录

参照八字模块"AI报告管道要不要拆进各自模块"这次的决策（各模块的AI报告各自独立成文，不做成一份跨模块的通用管道文档，因为报告页版式、AI指令、导出规格这些大概率各模块会长成完全不一样的东西），大五人格如果以后要做AI解读功能（对应`CLAUDE.md`"待完成"里"大五人格结果解读文字"这一条），**这套内容应该写在本文档里，不要写进八字那份**`Mindo-算法-八字.md`，即便两者在"怎么调Gemini""怎么处理JSON解析"这类纯技术层面可能有相通之处——那类纯技术层面的通用技巧，应该记进`CLAUDE.md`的"关键教训"里（供两边共同引用），不是把整套报告管道混着记在同一份文档里。

目前完全没有设计过：不知道会不会做成跟八字一样的"付费AI报告"模式，还是做成免费的简单解读；不知道数据流是否会复用`bazi_readings`那种"生成那一刻钉死快照"的模式。这些等真正要做的时候再讨论，这里先占位说明"以后做这个功能，記录位置在本文档"。

## 五、待完成

- [ ] 大五人格结果解读文字（尚未开工，见第四节）